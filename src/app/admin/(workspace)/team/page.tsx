'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import styles from '@/styles/team.module.css';
import { 
  Users, UserPlus, Power, Trash2, Edit, Terminal, 
  Eye, Building2, Shield, X, Loader2, KeyRound 
} from 'lucide-react';

// IMPORT SERVER ACTIONS
import { createInstructorAccount, updateInstructorAccount, deleteInstructorAccount } from '@/action/admin';

export interface TeamMember {
  id: string;
  username: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'auditor';
  status: 'active' | 'suspended';
  requires_pin_change: boolean;
}

interface Program {
  id: string;
  name: string;
}

export default function TeamManagementPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Create Modal State ───
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTeacherFullName, setNewTeacherFullName] = useState('');
  const [newTeacherLoginId, setNewTeacherLoginId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'super_admin' | 'auditor'>('admin');
  const [newMemberPrograms, setNewMemberPrograms] = useState<string[]>([]);
  const [generatedPin, setGeneratedPin] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // ─── Edit Modal State ───
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editLoginId, setEditLoginId] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'super_admin' | 'auditor'>('admin');
  const [editMemberPrograms, setEditMemberPrograms] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchTeam = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setCurrentUserId(session.user.id);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, role, status, requires_pin_change')
      .order('role', { ascending: false })
      .order('full_name', { ascending: true });

    if (!error && data) {
      setTeam(data as TeamMember[]);
    }

    const { data: programsData } = await supabase
      .from('programs')
      .select('id, name')
      .order('name', { ascending: true });

    if (programsData) setAllPrograms(programsData);

    setIsLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setTeam(prev => prev.map(member =>
      member.id === id ? { ...member, status: newStatus as 'active' | 'suspended' } : member
    ));
    const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', id);
    if (error) {
      alert("Failed to update status.");
      fetchTeam();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you absolutely sure you want to permanently delete ${name}? This revokes all system access.`)) {
      setTeam(prev => prev.filter(member => member.id !== id));
      const result = await deleteInstructorAccount(id);
      if (!result.success) {
        alert(`Failed to delete user: ${result.error}`);
        await fetchTeam();
      }
    }
  };

  const handleGeneratePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherLoginId.trim() || !newTeacherFullName.trim()) return;

    if (newMemberRole === 'admin' && newMemberPrograms.length === 0) {
        alert("Please assign the user to at least one program.");
        return;
    }

    setIsCreating(true);
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();

    const result = await createInstructorAccount(newTeacherLoginId.trim(), newTeacherFullName, randomPin, newMemberRole, newMemberPrograms);

    if (result.success) {
      setGeneratedPin(randomPin);
      await fetchTeam();
    } else {
      alert(`Error creating user: ${result.error}`);
    }
    setIsCreating(false);
  };

  const openEditModal = async (member: TeamMember) => {
    setEditingUserId(member.id);
    setEditFullName(member.full_name);
    setEditLoginId(member.username);
    setEditRole(member.role);

    const { data } = await supabase
      .from('program_assignments')
      .select('program_id')
      .eq('user_id', member.id);

    setEditMemberPrograms(data?.map(d => d.program_id) || []);
    setIsEditModalOpen(true);
  };

  const handleUpdateInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLoginId.trim() || !editFullName.trim()) return;

    if (editRole === 'admin' && editMemberPrograms.length === 0) {
        alert("Please assign the user to at least one program.");
        return;
    }

    setIsUpdating(true);

    const result = await updateInstructorAccount(editingUserId, editLoginId.trim(), editFullName, editRole, editMemberPrograms);

    if (result.success) {
      setIsEditModalOpen(false);
      await fetchTeam();
    } else {
      alert(`Error updating user: ${result.error}`);
    }
    setIsUpdating(false);
  };

  const closeAndResetCreateModal = () => {
    setIsModalOpen(false);
    setNewTeacherFullName('');
    setNewTeacherLoginId('');
    setNewMemberRole('admin');
    setNewMemberPrograms([]);
    setGeneratedPin('');
  };

  const toggleProgramSelection = (programId: string, stateArray: string[], setStateFunc: React.Dispatch<React.SetStateAction<string[]>>) => {
      if (stateArray.includes(programId)) {
          setStateFunc(stateArray.filter(id => id !== programId));
      } else {
          setStateFunc([...stateArray, programId]);
      }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--brand-green)" />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>

      <header className={styles.header}>
        <div>
          <h1>Team Management</h1>
          <p>Add instructors and manage system access.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className={styles.createBtn}>
          <UserPlus size={18} /> Add Team Member
        </button>
      </header>

      {/* ─── TEAM TABLE ─── */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Member Name</th>
              <th>System Login (Email/Phone)</th>
              <th>Access Level</th>
              <th>Account Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {team.map((member) => (
              <tr key={member.id} className={member.status === 'suspended' ? styles.rowSuspended : ''}>
                <td>
                  <strong>{member.full_name}</strong>
                  {member.id === currentUserId && <span className={styles.youTag}>You</span>}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {member.username}
                </td>
                <td>
                  {member.role === 'super_admin' ? (
                    <span className={`${styles.badge} ${styles.badgeSuper}`}>
                      <Terminal size={12} /> Developer
                    </span>
                  ) : member.role === 'auditor' ? (
                    <span className={`${styles.badge} ${styles.badgeAuditor}`}>
                      <Eye size={12} /> Auditor
                    </span>
                  ) : (
                    <span className={`${styles.badge} ${styles.badgeAdmin}`}>
                      <Users size={12} /> Instructor
                    </span>
                  )}
                </td>
                <td>
                  {member.status === 'active' ? (
                    <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>
                  ) : (
                    <span className={`${styles.badge} ${styles.badgeSuspended}`}>Suspended</span>
                  )}
                </td>
                <td>
                  <div className={styles.actionCell}>
                    {member.id !== currentUserId && (
                      <>
                        <button onClick={() => openEditModal(member)} className={styles.iconBtn} title="Edit Member">
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(member.id, member.status)}
                          className={`${styles.iconBtn} ${member.status === 'suspended' ? styles.reactivate : ''}`}
                          title={member.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                        >
                          <Power size={16} />
                        </button>
                        <button onClick={() => handleDelete(member.id, member.full_name)} className={`${styles.iconBtn} ${styles.danger}`} title="Delete Account">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── ADD TEAM MEMBER MODAL ─── */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !isCreating && !generatedPin && closeAndResetCreateModal()}>
          <div className={styles.modalPanel} onClick={e => e.stopPropagation()}>

            <div className={styles.modalHeader}>
              <div>
                <h2>Provide Access</h2>
                <p>Generate credentials for a new team member.</p>
              </div>
              {!generatedPin && (
                <button type="button" className={styles.closeBtn} onClick={closeAndResetCreateModal}>
                  <X size={24} />
                </button>
              )}
            </div>

            <div className={styles.modalBody}>
              {!generatedPin ? (
                <form id="createForm" onSubmit={handleGeneratePin}>

                  <div className={styles.formGroup}>
                    <label>Access Level</label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => {
                        const role = e.target.value as any;
                        setNewMemberRole(role);
                        if (role !== 'admin') setNewMemberPrograms([]);
                      }}
                    >
                      <option value="admin">Instructor (Standard Access)</option>
                      <option value="auditor">Auditor (View Only Dashboard)</option>
                      <option value="super_admin">Developer (Full System Control)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Full Name</label>
                    <input
                      type="text" autoFocus required
                      value={newTeacherFullName}
                      onChange={(e) => setNewTeacherFullName(e.target.value)}
                      placeholder="e.g. Mulubahzumu Kemmeh Sipor"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Login ID (Email or Phone Number)</label>
                    <input
                      type="text" required
                      value={newTeacherLoginId}
                      onChange={(e) => setNewTeacherLoginId(e.target.value)}
                      placeholder="name@example.com or 0777..."
                    />
                    <span className={styles.inputHint}>They will use this to log in.</span>
                  </div>

                  {newMemberRole === 'admin' && (
                    <div className={styles.formGroup}>
                      <label>
                        <Building2 size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }}/>
                        Assign Programs
                      </label>
                      <div className={styles.checklistContainer}>
                        {allPrograms.map(program => (
                          <label key={program.id}>
                            <input
                              type="checkbox"
                              checked={newMemberPrograms.includes(program.id)}
                              onChange={() => toggleProgramSelection(program.id, newMemberPrograms, setNewMemberPrograms)}
                            />
                            {program.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              ) : (
                <div>
                  <div className={styles.successMessage}>
                    <strong>Account Created!</strong><br/>
                    Share these credentials securely. They will be forced to change this PIN to a permanent 6-digit code upon their first login.
                  </div>
                  <div className={styles.formGroup}>
                    <label>Login ID</label>
                    <div className={styles.readonlyValue}>{newTeacherLoginId}</div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Temporary PIN</label>
                    <div className={styles.pinDisplay}>{generatedPin}</div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              {!generatedPin ? (
                <>
                  <button type="button" onClick={closeAndResetCreateModal} className={styles.cancelBtn}>Cancel</button>
                  <button type="submit" form="createForm" disabled={isCreating} className={styles.approveBtn}>
                    {isCreating ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                    {isCreating ? 'Generating...' : 'Generate PIN'}
                  </button>
                </>
              ) : (
                <button onClick={closeAndResetCreateModal} className={styles.approveBtn} style={{ width: '100%', justifyContent: 'center' }}>
                  Done
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ─── EDIT MEMBER MODAL ─── */}
      {isEditModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !isUpdating && setIsEditModalOpen(false)}>
          <div className={styles.modalPanel} onClick={e => e.stopPropagation()}>

            <div className={styles.modalHeader}>
              <div>
                <h2>Edit Member</h2>
                <p>Update their details or access level.</p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={() => !isUpdating && setIsEditModalOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <form id="editForm" onSubmit={handleUpdateInstructor}>

                <div className={styles.formGroup}>
                  <label>Access Level</label>
                  <select
                    value={editRole}
                    onChange={(e) => {
                      const role = e.target.value as any;
                      setEditRole(role);
                      if (role !== 'admin') setEditMemberPrograms([]);
                    }}
                    disabled={editingUserId === currentUserId}
                  >
                    <option value="admin">Instructor (Standard Access)</option>
                    <option value="auditor">Auditor (View Only Dashboard)</option>
                    <option value="super_admin">Developer (Full System Control)</option>
                  </select>
                  {editingUserId === currentUserId && (
                    <span className={styles.inputHint} style={{ color: '#eab308' }}>You cannot change your own access level.</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Full Name</label>
                  <input
                    type="text" autoFocus required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Login ID (Email or Phone Number)</label>
                  <input
                    type="text" required
                    value={editLoginId}
                    onChange={(e) => setEditLoginId(e.target.value)}
                  />
                  <span className={styles.inputHint}>If changed, they must log in with this new ID. Their PIN stays the same.</span>
                </div>

                {editRole === 'admin' && (
                  <div className={styles.formGroup}>
                    <label>
                      <Building2 size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }}/>
                      Assign Programs
                    </label>
                    <div className={styles.checklistContainer}>
                      {allPrograms.map(program => (
                        <label key={program.id}>
                          <input
                            type="checkbox"
                            checked={editMemberPrograms.includes(program.id)}
                            onChange={() => toggleProgramSelection(program.id, editMemberPrograms, setEditMemberPrograms)}
                          />
                          {program.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className={styles.cancelBtn}>Cancel</button>
              <button type="submit" form="editForm" disabled={isUpdating} className={styles.approveBtn}>
                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : null}
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}