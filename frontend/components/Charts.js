'use client';

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { eventDistribution, revenueChart } from '../lib/demo-data';

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={revenueChart} margin={{ top: 18, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000}K €`} />
        <Tooltip formatter={(value) => `${Number(value).toLocaleString('ro-RO')} €`} />
        <Bar dataKey="estimated" fill="#c4b5fd" radius={[7, 7, 0, 0]} stroke="#8b5cf6" strokeDasharray="4 4" />
        <Bar dataKey="actual" fill="#7c3aed" radius={[7, 7, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EventDonut() {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <PieChart>
        <Pie data={eventDistribution} innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
          {eventDistribution.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
