'use client';

import ResourcePage from '../../components/ResourcePage';
import { resourceConfigs } from '../../lib/resource-configs';

export default function InvoicesPage() {
  return <ResourcePage {...resourceConfigs.invoices} />;
}
