import { Link } from "react-router-dom";
import { ShoppingCart, Briefcase, Users, Activity, Package, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "../../providers/AuthProvider";
import { ROUTES } from "../../constants/routes.constants";
import { StatsCard, CardComponent, Badge, LoadingState, Alert, Button } from "../../components/ui";
import { useDashboardStats } from "../../hooks";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { user } = useAuth();
  const { stats, recentActivity, isLoading, error, refetch } = useDashboardStats();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardAdmin']);
  const isRTL = i18n.language === 'ar';

  const quickActions = [
    {
      title: t('dashboardAdmin:inventory'),
      description: t('dashboardAdmin:inventoryDesc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      link: ROUTES.INVENTORY,
      color: "from-primary to-primary-dark",
      hoverColor: "hover:shadow-primary/20"
    },
    {
      title: t('dashboardAdmin:orders'),
      description: t('dashboardAdmin:ordersDesc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      link: ROUTES.ORDERS,
      color: "from-secondary to-secondary-dark",
      hoverColor: "hover:shadow-secondary/20"
    },
    {
      title: t('dashboardAdmin:projects'),
      description: t('dashboardAdmin:projectsDesc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0l-4 4m4-4l-4-4" />
        </svg>
      ),
      link: ROUTES.PROJECTS,
      color: "from-accent to-yellow-600",
      hoverColor: "hover:shadow-accent/20"
    },
    {
      title: t('dashboardAdmin:teams'),
      description: t('dashboardAdmin:teamsDesc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      link: ROUTES.TEAMS,
      color: "from-purple-500 to-purple-700",
      hoverColor: "hover:shadow-purple-500/20"
    }
  ];

  // Show loading state
  if (isLoading) {
    return <LoadingState type="skeleton" text={t('dashboardCommon:loading')} />;
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardAdmin:failedToLoad')}</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={refetch}
            >
              {t('dashboardCommon:retry')}
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // Format timestamp for activity
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return t('dashboardCommon:minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('dashboardCommon:hoursAgo', { count: diffHours });
    return t('dashboardCommon:daysAgo', { count: diffDays });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Welcome Header */}
      <div className="group relative overflow-hidden bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-[#003300]/20 shadow-lg hover:shadow-2xl transition-all duration-500 ease-out">
        {/* Animated Background Gradient on Hover */}
        <div className="absolute inset-0 bg-[#003300]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl sm:rounded-2xl" />
        
        {/* Shimmer Effect */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-transparent rounded-xl sm:rounded-2xl" />
        
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2 group-hover:scale-105 transition-transform duration-300 inline-block" style={{ 
            color: '#003300',
            backgroundClip: 'text'
          }}>
            {t('dashboardAdmin:welcomeBackGreeting', { name: user?.name || t('dashboardCommon:welcome') })}
          </h1>
          <p className={`text-lg transition-colors duration-300 ${isRTL ? 'font-arabic text-right' : ''}`} style={{ color: '#003300' + 'CC' }}>
            {t('dashboardAdmin:welcomeMessage')}
          </p>
        </div>

        {/* Corner Decoration */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-[#003300]/5 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-[#cccc99]/30 rounded-tr-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => (
          <Link
            key={index}
            to={action.link}
            className="group relative bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 border border-[#003300]/20 shadow-lg hover:shadow-2xl transition-all duration-500 ease-out overflow-hidden cursor-pointer hover:-translate-y-2"
          >
            {/* Animated Background Gradient on Hover */}
            <div className="absolute inset-0 bg-[#003300]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl sm:rounded-2xl" />
            
            {/* Shimmer Effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-transparent rounded-xl sm:rounded-2xl" />

            <div className="relative z-10">
              <div className="mb-4 group-hover:scale-110 transition-transform duration-300" style={{ color: '#003300' }}>
                {action.icon}
              </div>

              <h3 className="text-xl font-bold mb-2 group-hover:text-[#003300] transition-colors duration-300" style={{ color: '#003300' }}>
                {action.title}
              </h3>
              
              <p className="text-sm leading-relaxed transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>
                {action.description}
              </p>
              
              <div className={`mt-4 flex items-center font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isRTL ? 'flex-row-reverse' : ''}`} style={{ color: '#003300' }}>
                <span className="text-sm">{t('dashboardAdmin:getStarted')}</span>
                <svg className={`w-4 h-4 ${isRTL ? 'mr-2' : 'ml-2'} group-hover:translate-x-1 transition-transform duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Corner Decoration */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#003300]/5 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </Link>
        ))}
      </div>

      {/* Stats Cards - Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          label={t('dashboardAdmin:pendingOrders')}
          value={stats?.orders.active || 0}
          icon={<ShoppingCart className="w-6 h-6" />}
          trend={{ value: stats?.orders.trend || 0, isPositive: true }}
        />

        <StatsCard
          label={t('dashboardAdmin:activeProjects')}
          value={stats?.projects.total || 0}
          icon={<Briefcase className="w-6 h-6" />}
          trend={{ value: stats?.projects.trend || 0, isPositive: true }}
        />

        <StatsCard
          label={t('dashboardAdmin:totalTeams')}
          value={stats?.teams.members || 0}
          icon={<Users className="w-6 h-6" />}
          trend={{ value: stats?.teams.trend || 0, isPositive: true }}
        />

        <StatsCard
          label={t('dashboardAdmin:inventory')}
          value={stats?.parts.total || 0}
          icon={<Package className="w-6 h-6" />}
        />
      </div>

      {/* Low Stock Warning */}
      {stats && (stats.parts.lowStock > 0 || stats.parts.outOfStock > 0) && (
        <Alert variant="warning">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">{t('dashboardAdmin:inventoryAlert')}</p>
              <p className="text-sm">
                {stats.parts.lowStock > 0 && `${stats.parts.lowStock} items low on stock. `}
                {stats.parts.outOfStock > 0 && `${stats.parts.outOfStock} items out of stock.`}
              </p>
              <Link to={ROUTES.INVENTORY}>
                <Button variant="ghost" size="sm" className="mt-2">
                  {t('dashboardAdmin:viewInventory')} →
                </Button>
              </Link>
            </div>
          </div>
        </Alert>
      )}

      {/* Recent Activity - Real Data */}
      <CardComponent variant="glass">
        <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Activity className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold text-[#003300]">{t('dashboardAdmin:recentActivity')}</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={refetch}
          >
            {t('dashboardCommon:refresh')}
          </Button>
        </div>

        {recentActivity.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-primary/30 mx-auto mb-4" />
            <p className="text-[#003300]/70">{t('dashboardCommon:noResults')}</p>
            <p className="text-[#003300]/50 text-sm mt-2">
              {t('dashboardAdmin:emptyActivityMessage')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border border-transparent hover:border-[#003300]/20 group ${isRTL ? 'flex-row-reverse' : ''}`}
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                }}
              >
                <Badge
                  variant={
                    activity.type === 'order' ? 'primary' :
                    activity.type === 'project' ? 'secondary' :
                    activity.type === 'inventory' ? 'error' :
                    activity.type === 'team' ? 'accent' : 'info'
                  }
                  size="sm"
                >
                  {activity.type}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-[#003300] text-sm font-medium truncate">
                    {activity.title}
                  </p>
                  <p className="text-[#003300]/60 text-xs mt-1 truncate">
                    {activity.description}
                  </p>
                </div>
                <span className="text-[#003300]/50 text-xs whitespace-nowrap">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </CardComponent>

      {/* Additional Stats Row */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardComponent variant="glass" hover className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#003300]/60 text-sm mb-1">{t('dashboardAdmin:totalOrders')}</p>
                <p className="text-2xl font-bold text-[#003300]">{stats.orders.completed}</p>
              </div>
              <ShoppingCart className="w-10 h-10 text-primary/50" />
            </div>
          </CardComponent>

          <CardComponent variant="glass" hover className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#003300]/60 text-sm mb-1">{t('dashboardAdmin:activeProjects')}</p>
                <p className="text-2xl font-bold text-[#003300]">{stats.projects.active}</p>
              </div>
              <Briefcase className="w-10 h-10 text-secondary/50" />
            </div>
          </CardComponent>

          <CardComponent variant="glass" hover className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#003300]/60 text-sm mb-1">{t('dashboardAdmin:totalTeams')}</p>
                <p className="text-2xl font-bold text-[#003300]">{stats.teams.total}</p>
              </div>
              <Users className="w-10 h-10 text-accent/50" />
            </div>
          </CardComponent>
        </div>
      )}
    </motion.div>
  );
}