import { useSelector } from 'react-redux';
import { API_BASE } from '../lib/api';

/**
 * Returns resolved branding values from the current workspace.
 * Falls back to Zync defaults when fields are empty.
 */
export function useBranding() {
  const workspace = useSelector((s) => s.workspace.current);

  const displayName  = workspace?.custom_name  || workspace?.name  || 'Zync';
  const primaryColor = workspace?.primary_color || '#6366f1';
  const description  = workspace?.description  || '';

  const logoURL = workspace?.logo_url
    ? workspace.logo_url.startsWith('http')
      ? workspace.logo_url
      : `${API_BASE}${workspace.logo_url}`
    : null;

  return { displayName, primaryColor, logoURL, description, workspace };
}
