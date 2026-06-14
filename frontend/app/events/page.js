'use client';

import ResourcePage from '../../components/ResourcePage';
import { resourceConfigs } from '../../lib/resource-configs';

export default function EventsPage() {
  return <ResourcePage {...resourceConfigs.events} />;
}
