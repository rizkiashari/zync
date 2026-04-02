import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useAuth } from "../context/AuthContext";
import { workspaceService } from "../services/workspaceService";

/**
 * Whether the signed-in user may POST /api/workspaces (owner, admin, no active workspace, or system admin).
 * Members of the current workspace may not create another.
 */
export function useCanCreateWorkspace() {
	const workspace = useSelector((s) => s.workspace.current);
	const { user } = useAuth();
	const isSystemAdmin = !!user?.is_system_admin;
	const [myRole, setMyRole] = useState(null);
	const [roleLoading, setRoleLoading] = useState(() => !!workspace?.slug);

	useEffect(() => {
		if (!workspace?.slug) {
			setMyRole(null);
			setRoleLoading(false);
			return;
		}
		let cancelled = false;
		setRoleLoading(true);
		(async () => {
			try {
				const res = await workspaceService.getCurrent();
				const r = res?.data?.data?.my_role ?? "";
				if (!cancelled) setMyRole(r || "");
			} catch {
				if (!cancelled) setMyRole("");
			} finally {
				if (!cancelled) setRoleLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [workspace?.slug]);

	const canCreateWorkspace = useMemo(() => {
		if (isSystemAdmin) return true;
		if (!workspace?.slug) return true;
		if (roleLoading) return false;
		return myRole !== "member";
	}, [isSystemAdmin, workspace?.slug, roleLoading, myRole]);

	const roleReady = !workspace?.slug || !roleLoading;

	return { canCreateWorkspace, roleLoading, myRole, roleReady };
}
