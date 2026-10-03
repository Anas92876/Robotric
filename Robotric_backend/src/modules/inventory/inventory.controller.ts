import type { Request, Response } from 'express';
import { currentUser } from '../../shared/http/request-user';
import type { ImageService } from '../images/images.service';
import type { Movement, Order } from '../inventory/inventory.repository';
import type { InventoryProjectRow, PartRow, StockLevelRow } from './inventory.table';
import type { InventoryService } from './inventory.service';

// These endpoints returned bare documents (no `success` wrapper), as before.
export const partDoc = (p: PartRow) => ({
  _id: p.id,
  name: p.name,
  category: p.category,
  description: p.description,
  sku: p.sku,
  group: p.group,
  partNumber: p.partNumber,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});
const levelDoc = (l: StockLevelRow) => ({
  _id: l.partId,
  partId: l.partId,
  availableQty: l.availableQty,
  reservedQty: l.reservedQty,
  usedQty: l.usedQty,
  damagedQty: l.damagedQty,
  updatedAt: l.updatedAt,
});
const movementDoc = (m: Movement) => ({
  _id: m.id,
  partId: m.partId,
  partName: m.partName,
  sku: m.sku,
  qtyChange: m.qtyChange,
  reason: m.reason,
  notes: m.notes,
  createdAt: m.createdAt,
  createdBy: m.createdBy ? { name: m.createdBy.name, id: m.createdBy.id } : null,
});
const orderDoc = (o: Order) => ({
  _id: o.id,
  studentId: o.studentId,
  projectId: o.projectId,
  status: o.status,
  items: o.items.map((i) => ({ partId: i.part ? partDoc(i.part) : i.partId, qty: i.qty })),
  createdAt: o.createdAt,
});
const projectDoc = (p: InventoryProjectRow) => ({ _id: p.id, title: p.title, description: p.description, ownerId: p.ownerId, parts: p.parts, createdAt: p.createdAt, updatedAt: p.updatedAt });

const actor = (req: Request) => {
  const u = currentUser(req);
  return { id: u.id, role: u.role };
};
type IdReq = Request<{ id: string }>;
const query = (req: Request) => req.query as Record<string, string | undefined>;

/** /api/parts — the list and details are public, as before. */
export class PartController {
  constructor(
    private readonly inventory: InventoryService,
    private readonly images: ImageService,
  ) {}

  private async enrich(list: PartRow[]) {
    const ids = list.map((p) => p.id);
    const [levels, urls] = await Promise.all([this.inventory.levels(ids), this.images.urlsFor('part', ids)]);
    return list.map((p) => ({ ...partDoc(p), availableQty: levels.get(p.id)?.availableQty ?? 0, reservedQty: levels.get(p.id)?.reservedQty ?? 0, imageUrl: urls.get(p.id) }));
  }

  list = async (_req: Request, res: Response) => {
    res.json(await this.enrich(await this.inventory.listParts()));
  };

  get = async (req: IdReq, res: Response) => {
    res.json((await this.enrich([await this.inventory.part(req.params.id)]))[0]);
  };

  create = async (req: Request, res: Response) => {
    res.status(201).json(partDoc(await this.inventory.createPart(req.body)));
  };

  update = async (req: IdReq, res: Response) => {
    res.json(partDoc(await this.inventory.updatePart(req.params.id, req.body)));
  };

  delete = async (req: IdReq, res: Response) => {
    await this.inventory.deletePart(req.params.id);
    res.json({ success: true, message: 'Part deleted successfully' });
  };
}

/** /api/stock */
export class StockController {
  constructor(private readonly inventory: InventoryService) {}

  levels = async (req: Request, res: Response) => {
    const r = await this.inventory.stockLevels(query(req));
    res.json({ items: r.rows.map((l) => ({ ...levelDoc(l), part: partDoc(l.part) })), total: r.total, page: r.page, totalPages: Math.ceil(r.total / r.limit) });
  };

  stats = async (_req: Request, res: Response) => {
    res.json(await this.inventory.stats());
  };

  categories = async (_req: Request, res: Response) => {
    res.json(await this.inventory.categories());
  };

  recent = async (req: Request, res: Response) => {
    // The recent list never carried partId or notes.
    res.json((await this.inventory.recent(query(req).limit)).map((m) => {
      const { partId: _p, notes: _n, ...rest } = movementDoc(m);
      return rest;
    }));
  };

  history = async (req: Request, res: Response) => {
    res.json((await this.inventory.history(query(req))).map(movementDoc));
  };

  adjust = async (req: Request, res: Response) => {
    const { part, level } = await this.inventory.adjust(actor(req), req.body);
    res.json({ ...levelDoc(level), partId: partDoc(part) });
  };
}

/** /api/orders */
export class OrderController {
  constructor(private readonly inventory: InventoryService) {}

  list = async (req: Request, res: Response) => {
    res.json((await this.inventory.listOrders(actor(req))).map(orderDoc));
  };

  create = async (req: Request, res: Response) => {
    res.status(201).json(orderDoc(await this.inventory.createOrder(actor(req), req.body)));
  };

  approve = async (req: IdReq, res: Response) => {
    res.json(orderDoc(await this.inventory.approve(actor(req), req.params.id)));
  };

  reject = async (req: IdReq, res: Response) => {
    res.json(orderDoc(await this.inventory.reject(actor(req), req.params.id)));
  };

  fulfill = async (req: IdReq, res: Response) => {
    res.json(orderDoc(await this.inventory.fulfill(actor(req), req.params.id)));
  };

  cancel = async (req: IdReq, res: Response) => {
    res.json(orderDoc(await this.inventory.cancel(actor(req), req.params.id)));
  };
}

/** /api/projects — personal build projects with a parts list. */
export class InventoryProjectController {
  constructor(private readonly inventory: InventoryService) {}

  list = async (req: Request, res: Response) => {
    res.json((await this.inventory.listProjects(actor(req))).map(projectDoc));
  };

  create = async (req: Request, res: Response) => {
    res.status(201).json(projectDoc(await this.inventory.createProject(actor(req), req.body)));
  };

  update = async (req: IdReq, res: Response) => {
    res.json(projectDoc(await this.inventory.updateProject(actor(req), req.params.id, req.body)));
  };

  setParts = async (req: IdReq, res: Response) => {
    res.json(projectDoc(await this.inventory.setProjectParts(actor(req), req.params.id, req.body)));
  };

  delete = async (req: IdReq, res: Response) => {
    await this.inventory.deleteProject(actor(req), req.params.id);
    res.json({ success: true, message: 'Project deleted successfully' });
  };
}
