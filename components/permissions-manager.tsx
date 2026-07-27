"use client";

import { useMemo, useState } from "react";
import type { ModuleKey, UserRole } from "@/lib/domain";
import type { PermissionProfile, PermissionRecord } from "@/lib/permissions-admin";

type PermissionModule = {
  key: ModuleKey;
  label: string;
  description: string;
};

type PermissionsManagerProps = {
  modules: PermissionModule[];
  permissions: PermissionRecord[];
  profiles: PermissionProfile[];
};

function permissionKey(profileId: string, module: ModuleKey) {
  return `${profileId}:${module}`;
}

function roleLabel(role: UserRole) {
  return role === "admin" ? "Administrador" : "Empleado";
}

export function PermissionsManager({ modules, permissions, profiles }: PermissionsManagerProps) {
  const firstEditableProfile = profiles.find((profile) => profile.role !== "admin") ?? profiles[0];
  const [selectedProfileId, setSelectedProfileId] = useState(firstEditableProfile?.id ?? "");
  const [permissionMap, setPermissionMap] = useState(
    () =>
      new Map(
        permissions.map((permission) => [
          permissionKey(permission.profileId, permission.module),
          permission.canAccess
        ])
      )
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId);
  const isAdminProfile = selectedProfile?.role === "admin";

  const enabledCount = useMemo(() => {
    if (!selectedProfile) {
      return 0;
    }

    if (selectedProfile.role === "admin") {
      return modules.length;
    }

    return modules.filter((module) => permissionMap.get(permissionKey(selectedProfile.id, module.key))).length;
  }, [modules, permissionMap, selectedProfile]);

  async function updatePermission(module: ModuleKey, canAccess: boolean) {
    if (!selectedProfile || isAdminProfile) {
      return;
    }

    const key = permissionKey(selectedProfile.id, module);
    const previousMap = permissionMap;
    const nextMap = new Map(permissionMap);
    nextMap.set(key, canAccess);
    setPermissionMap(nextMap);
    setSavingKey(key);
    setMessage("");

    try {
      const response = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: selectedProfile.id,
          module,
          canAccess
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "No se pudo actualizar el permiso.");
      }

      setMessage("Permiso actualizado.");
    } catch (error) {
      setPermissionMap(previousMap);
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el permiso.");
    } finally {
      setSavingKey(null);
    }
  }

  if (!profiles.length) {
    return <p className="form-message">No hay perfiles creados todavia.</p>;
  }

  return (
    <div className="permission-manager">
      <div className="permission-toolbar">
        <label className="field permission-user-select">
          <span>Usuario</span>
          <select value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)}>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.fullName} - {roleLabel(profile.role)}
              </option>
            ))}
          </select>
        </label>
        <div className="permission-summary">
          <span>{selectedProfile?.active ? "Activo" : "Inactivo"}</span>
          <strong>
            {enabledCount}/{modules.length} modulos
          </strong>
        </div>
      </div>

      {isAdminProfile ? (
        <p className="permission-note">Este usuario es administrador, por rol siempre tiene acceso completo.</p>
      ) : null}

      <div className="permission-module-list">
        {modules.map((module) => {
          const key = selectedProfile ? permissionKey(selectedProfile.id, module.key) : module.key;
          const checked = Boolean(isAdminProfile || (selectedProfile && permissionMap.get(key)));
          const saving = savingKey === key;

          return (
            <label className="permission-module-row" key={module.key}>
              <span className="permission-module-copy">
                <strong>{module.label}</strong>
                <small>{module.description}</small>
              </span>
              <input
                type="checkbox"
                checked={checked}
                disabled={!selectedProfile || isAdminProfile || saving}
                onChange={(event) => updatePermission(module.key, event.target.checked)}
              />
            </label>
          );
        })}
      </div>

      {message ? <p className="form-message">{message}</p> : null}
    </div>
  );
}
