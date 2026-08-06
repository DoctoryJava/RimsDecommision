import { Settings, Zap, Database, HardDrive, Shield, Bell, Globe } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';

export default function SettingsPage() {
  const sections = [
    { icon: Zap, title: 'Databricks Engine', desc: 'Cluster configuration, runtime version, and connection settings' },
    { icon: Database, title: 'Global DB Defaults', desc: 'Default connection pool, timeout, and retry settings for all systems' },
    { icon: HardDrive, title: 'Storage Defaults', desc: 'Default bucket policies, lifecycle rules, and retention periods' },
    { icon: Shield, title: 'Security', desc: 'Encryption, audit logging, and IP allowlist configuration' },
    { icon: Bell, title: 'Notifications', desc: 'Email alerts for sync failures, archival events, and system changes' },
    { icon: Globe, title: 'API & Webhooks', desc: 'External API access tokens and webhook endpoints' },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Settings" subtitle="Global configuration for the lifecycle management platform" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} hover className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                  <Icon size={22} className="text-neutral-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-neutral-900">{section.title}</h3>
                  <p className="text-sm text-neutral-500 mt-0.5">{section.desc}</p>
                  <div className="mt-4">
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">System Version</h3>
            <p className="text-sm text-neutral-500 mt-0.5">Lifecycle Data Retention Suite v2.4.1</p>
          </div>
          <Badge color="success" dot>All systems operational</Badge>
        </div>
      </Card>
    </div>
  );
}
