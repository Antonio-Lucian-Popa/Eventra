'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trash2, Users } from 'lucide-react';
import { apiFetch, apiRequest, createResource, deleteResource } from '../lib/api';

// Administrare echipe de lucratori: fiecare echipa are un responsabil (lead)
// si o lista de membri. Evenimentele se aloca pe echipe, nu pe persoane.
export default function TeamsManager({ setNotice }) {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [newName, setNewName] = useState('');
  const [newLead, setNewLead] = useState('');
  const [available, setAvailable] = useState(true);

  const load = useCallback(async () => {
    try {
      const [teamList, userList] = await Promise.all([
        apiFetch('/teams'),
        apiFetch('/organization/users'),
      ]);
      setTeams(teamList || []);
      setUsers(userList || []);
      setAvailable(true);
    } catch {
      setAvailable(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createTeam(event) {
    event.preventDefault();
    if (!newName.trim()) return;
    try {
      await createResource('/teams', { name: newName.trim(), leadId: newLead || undefined });
      setNewName('');
      setNewLead('');
      setNotice?.('Echipă creată.');
      await load();
    } catch (err) {
      setNotice?.(err.message);
    }
  }

  async function updateLead(teamId, leadId) {
    try {
      await apiRequest(`/teams/${teamId}`, { method: 'PATCH', body: JSON.stringify({ leadId: leadId || null }) });
      setNotice?.('Responsabil actualizat.');
      await load();
    } catch (err) {
      setNotice?.(err.message);
    }
  }

  async function toggleMember(team, userId, checked) {
    const current = new Set((team.members || []).map((m) => m.id));
    if (checked) current.add(userId);
    else current.delete(userId);
    try {
      await apiRequest(`/teams/${team.id}/members`, { method: 'PUT', body: JSON.stringify({ userIds: [...current] }) });
      await load();
    } catch (err) {
      setNotice?.(err.message);
    }
  }

  async function removeTeam(teamId) {
    if (!window.confirm('Ștergi această echipă? Membrii rămân în organizație.')) return;
    try {
      await deleteResource('/teams', teamId);
      setNotice?.('Echipă ștearsă.');
      await load();
    } catch (err) {
      setNotice?.(err.message);
    }
  }

  if (!available) {
    return (
      <section className="card detail-card" style={{ marginTop: 18 }}>
        <div className="card-title">Echipe</div>
        <p className="row-subtitle" style={{ marginTop: 10 }}>
          Gestionarea echipelor devine disponibilă când ești conectat la API.
        </p>
      </section>
    );
  }

  return (
    <section className="card detail-card" style={{ marginTop: 18 }}>
      <div className="card-title">
        <Users size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        Echipe
      </div>
      <p className="row-subtitle" style={{ marginTop: 6 }}>
        Alocă evenimentele pe echipe. Responsabilul coordonează restul echipei.
      </p>

      <form className="toolbar" onSubmit={createTeam} style={{ marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
        <input className="input" placeholder="Nume echipă (ex: Echipa A)" value={newName} onChange={(event) => setNewName(event.target.value)} />
        <select className="input" value={newLead} onChange={(event) => setNewLead(event.target.value)}>
          <option value="">Fără responsabil</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>
        <button className="btn primary" type="submit">Adaugă echipă</button>
      </form>

      <div className="grid" style={{ marginTop: 18, gap: 14 }}>
        {teams.length === 0 ? (
          <div className="empty-state">Nu există încă echipe.</div>
        ) : (
          teams.map((team) => {
            const memberIds = new Set((team.members || []).map((m) => m.id));
            return (
              <div key={team.id} className="card" style={{ padding: 16 }}>
                <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                  <strong>{team.name}</strong>
                  <button className="btn icon" type="button" aria-label="Șterge echipă" onClick={() => removeTeam(team.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="field" style={{ marginTop: 12 }}>
                  <label>Responsabil</label>
                  <select value={team.leadId || ''} onChange={(event) => updateLead(team.id, event.target.value)}>
                    <option value="">Fără responsabil</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>

                <div className="field" style={{ marginTop: 12 }}>
                  <label>Membri ({memberIds.size})</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {users.map((user) => (
                      <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={memberIds.has(user.id)}
                          onChange={(event) => toggleMember(team, user.id, event.target.checked)}
                        />
                        {user.name}
                        <span className="row-subtitle">{team.leadId === user.id ? '· responsabil' : ''}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
