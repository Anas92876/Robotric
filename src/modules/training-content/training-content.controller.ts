import type { Request, Response } from 'express';
import { withMongoId } from '../../shared/http/serialize';
import { parse } from '../../shared/http/validate';
import { upsertBody } from './training-content.schemas';
import { assertLang, type TrainingContentService } from './training-content.service';
import type { TrainingPageContentRow } from './training-content.table';

const toApi = (row: TrainingPageContentRow | null) => (row ? withMongoId(row) : null);

type ImageParams = { trackId: string; programIndex: string; deptIndex: string; publicId: string };

export class TrainingContentController {
  constructor(private readonly content: TrainingContentService) {}

  /** GET /api/public/training-content — no auth; both languages at once. */
  getPublic = async (_req: Request, res: Response) => {
    const { ar, en } = await this.content.getBoth();
    res.json({ success: true, data: { ar: toApi(ar), en: toApi(en) } });
  };

  get = async (req: Request<{ lang: string }>, res: Response) => {
    const { lang } = req.params;
    assertLang(lang);
    res.json({ success: true, data: toApi(await this.content.get(lang)) });
  };

  upsert = async (req: Request<{ lang: string }>, res: Response) => {
    const { lang } = req.params;
    assertLang(lang);
    const { statsValues, tracks } = parse(upsertBody, req.body);
    const doc = await this.content.upsert(lang, statsValues, tracks);
    res.json({ success: true, message: 'Training page content saved', data: toApi(doc) });
  };

  addProgramImage = async (req: Request<ImageParams>, res: Response) => {
    const image = await this.content.addProgramImage(req.params.trackId, req.params.programIndex, req.file);
    res.json({ success: true, data: image });
  };

  removeProgramImage = async (req: Request<ImageParams>, res: Response) => {
    const { trackId, programIndex, publicId } = req.params;
    await this.content.removeProgramImage(trackId, programIndex, publicId);
    res.json({ success: true, message: 'Image deleted' });
  };

  setDepartmentCover = async (req: Request<ImageParams>, res: Response) => {
    res.json({ success: true, data: await this.content.setDepartmentCover(req.params.deptIndex, req.file) });
  };

  removeDepartmentCover = async (req: Request<ImageParams>, res: Response) => {
    await this.content.removeDepartmentCover(req.params.deptIndex);
    res.json({ success: true, message: 'Cover deleted' });
  };

  addDepartmentProgramImage = async (req: Request<ImageParams>, res: Response) => {
    const { deptIndex, programIndex } = req.params;
    res.json({ success: true, data: await this.content.addDepartmentProgramImage(deptIndex, programIndex, req.file) });
  };

  removeDepartmentProgramImage = async (req: Request<ImageParams>, res: Response) => {
    const { deptIndex, programIndex, publicId } = req.params;
    await this.content.removeDepartmentProgramImage(deptIndex, programIndex, publicId);
    res.json({ success: true, message: 'Image deleted' });
  };
}
