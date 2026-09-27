import { useState } from 'react';
import {
  Button,
  Input,
  Modal,
  ConfirmDialog,
  Dropdown,
  Badge,
  DotBadge,
  NumberBadge,
  CardComponent,
  CardHeader,
  CardBody,
  CardFooter,
  StatsCard,
  useToast,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  Switch,
  SwitchGroup,
  Tabs,
  Avatar,
  AvatarGroup,
  Alert,
  Banner,
} from '../../components/ui';
import {
  Save,
  Trash2,
  Edit,
  Share,
  Users,
  Package,
  DollarSign,
  Mail,
  Lock,
  Settings,
  Bell,
  User,
} from 'lucide-react';

export default function ComponentShowcase() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [switchEnabled, setSwitchEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [showAlert, setShowAlert] = useState(true);
  const toast = useToast();

  const dropdownItems: Array<{
    label?: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    danger?: boolean;
    divider?: boolean;
  }> = [
    {
      label: 'Edit',
      icon: <Edit className="w-4 h-4" />,
      onClick: () => toast.info('Edit clicked'),
    },
    {
      label: 'Share',
      icon: <Share className="w-4 h-4" />,
      onClick: () => toast.info('Share clicked'),
    },
    { divider: true },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => setIsConfirmOpen(true),
      danger: true,
    },
  ];

  const tabItems = [
    {
      label: 'Profile',
      icon: <User className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <Input label="Name" placeholder="Enter your name" />
          <Input label="Email" type="email" leftIcon={<Mail className="w-4 h-4" />} />
        </div>
      ),
    },
    {
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      content: (
        <SwitchGroup title="Preferences">
          <Switch
            checked={darkMode}
            onChange={setDarkMode}
            label="Dark Mode"
            description="Use dark theme"
          />
          <Switch
            checked={switchEnabled}
            onChange={setSwitchEnabled}
            label="Notifications"
            description="Receive updates"
          />
        </SwitchGroup>
      ),
    },
    {
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      content: <div className="text-gray-400">Notification settings...</div>,
    },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Component Showcase
          </h1>
          <p className="text-gray-400">
            All 12 production-ready components in action
          </p>
        </div>

        {/* Banner */}
        {showAlert && (
          <Banner
            variant="info"
            onClose={() => setShowAlert(false)}
          >
            This is a showcase of all available UI components. Explore below! 👇
          </Banner>
        )}

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Buttons</h2>
          <CardComponent>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="success">Success</Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button leftIcon={<Save className="w-4 h-4" />}>
                With Icon
              </Button>
              <Button isLoading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </CardComponent>
        </section>

        {/* Inputs */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Inputs</h2>
          <CardComponent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" placeholder="Enter name" required />
              <Input
                label="Email"
                type="email"
                leftIcon={<Mail className="w-4 h-4" />}
                placeholder="you@example.com"
              />
              <Input
                label="Password"
                type="password"
                leftIcon={<Lock className="w-4 h-4" />}
                helperText="Must be at least 8 characters"
              />
              <Input
                label="With Error"
                error="This field is required"
                placeholder="Invalid input"
              />
            </div>
          </CardComponent>
        </section>

        {/* Badges */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Badges</h2>
          <CardComponent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="primary">Primary</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="info">Info</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge size="sm">Small</Badge>
                <Badge size="md">Medium</Badge>
                <Badge size="lg">Large</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge rounded onRemove={() => toast.success('Removed!')}>
                  Removable
                </Badge>
                <DotBadge variant="success" pulse>
                  Online
                </DotBadge>
                <NumberBadge count={42} />
                <NumberBadge count={150} max={99} />
              </div>
            </div>
          </CardComponent>
        </section>

        {/* Cards */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              label="Total Users"
              value="2,543"
              icon={<Users className="w-6 h-6" />}
              trend={{ value: 12.5, isPositive: true }}
            />
            <StatsCard
              label="Products"
              value="892"
              icon={<Package className="w-6 h-6" />}
              trend={{ value: 3.2, isPositive: false }}
            />
            <StatsCard
              label="Revenue"
              value="$12.4K"
              icon={<DollarSign className="w-6 h-6" />}
              trend={{ value: 8.7, isPositive: true }}
            />
            <CardComponent variant="elevated">
              <CardHeader
                title="Custom Card"
                description="With header and footer"
              />
              <CardBody>
                <p className="text-sm">Card content goes here...</p>
              </CardBody>
              <CardFooter divided>
                <Button size="sm" fullWidth>
                  Action
                </Button>
              </CardFooter>
            </CardComponent>
          </div>
        </section>

        {/* Avatars */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Avatars</h2>
          <CardComponent>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar size="xs" name="John Doe" />
                <Avatar size="sm" name="Jane Smith" status="online" />
                <Avatar size="md" name="Bob Johnson" status="away" />
                <Avatar size="lg" name="Alice Brown" status="busy" />
                <Avatar size="xl" name="Charlie Wilson" />
                <Avatar size="2xl" name="Diana Prince" status="online" />
              </div>
              <AvatarGroup
                avatars={[
                  { name: 'John Doe' },
                  { name: 'Jane Smith' },
                  { name: 'Bob Johnson' },
                  { name: 'Alice Brown' },
                  { name: 'Charlie Wilson' },
                  { name: 'Diana Prince' },
                ]}
                max={4}
                size="lg"
              />
            </div>
          </CardComponent>
        </section>

        {/* Alerts */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Alerts</h2>
          <div className="space-y-3">
            <Alert variant="success" title="Success!">
              Your changes have been saved successfully.
            </Alert>
            <Alert variant="error" title="Error" onClose={() => {}}>
              Something went wrong. Please try again.
            </Alert>
            <Alert variant="warning" title="Warning">
              Your trial expires in 3 days.
            </Alert>
            <Alert variant="info">
              This is an informational message.
            </Alert>
          </div>
        </section>

        {/* Tabs */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Tabs</h2>
          <CardComponent>
            <Tabs variant="pills" items={tabItems} />
          </CardComponent>
        </section>

        {/* Modals & Dropdowns */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Modals & Dropdowns
          </h2>
          <CardComponent>
            <div className="flex gap-4">
              <Button onClick={() => setIsModalOpen(true)}>
                Open Modal
              </Button>
              <Button onClick={() => setIsConfirmOpen(true)} variant="danger">
                Confirm Dialog
              </Button>
              <Dropdown trigger={<Button variant="outline">Dropdown</Button>} items={dropdownItems} />
              <Button
                onClick={() => {
                  toast.success('Success!', 'Operation completed');
                }}
              >
                Show Toast
              </Button>
            </div>
          </CardComponent>
        </section>

        {/* Skeletons */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Loading Skeletons
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonCard />
            <CardComponent>
              <div className="space-y-4">
                <Skeleton variant="rectangular" height={40} />
                <SkeletonText lines={4} />
                <div className="flex gap-2">
                  <Skeleton variant="circular" width={40} height={40} />
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </div>
                </div>
              </div>
            </CardComponent>
          </div>
        </section>

        {/* Switches */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Switches</h2>
          <CardComponent>
            <SwitchGroup title="Settings" description="Configure your preferences">
              <Switch
                checked={darkMode}
                onChange={setDarkMode}
                label="Dark Mode"
                description="Use dark theme across the app"
              />
              <Switch
                checked={switchEnabled}
                onChange={setSwitchEnabled}
                label="Email Notifications"
                description="Receive updates via email"
              />
              <Switch
                checked={false}
                onChange={() => {}}
                label="Disabled Switch"
                disabled
              />
            </SwitchGroup>
          </CardComponent>
        </section>
      </div>

      {/* Modals */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Example Modal"
        description="This is a modal dialog example"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary">Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" placeholder="Enter name" />
          <Input label="Email" type="email" placeholder="Enter email" />
          <p className="text-sm text-gray-400">
            Fill out the form and click save to continue.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          toast.success('Deleted!', 'Item has been removed');
          setIsConfirmOpen(false);
        }}
        title="Delete Item?"
        description="This action cannot be undone. Are you sure?"
        variant="danger"
      />
    </div>
  );
}
