'use client';

import ResourcePage from '../../components/ResourcePage';
import { resourceConfigs } from '../../lib/resource-configs';

export default function LeadsPage() {
  return <ResourcePage {...resourceConfigs.leads} />;
}
