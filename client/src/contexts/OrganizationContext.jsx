import { createContext, useContext, useState, useEffect } from 'react';
import { useOrganizations, useCreateOrganization } from '../hooks/useFixtures.js';

const OrganizationContext = createContext(null);

export function OrganizationProvider({ children }) {
  const [currentOrgSlug, setCurrentOrgSlug] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSlug = params.get('workspace');
    if (urlSlug) {
      localStorage.setItem('organization_slug', urlSlug);
      return urlSlug;
    }
    return localStorage.getItem('organization_slug') || '';
  });

  const { data: organizations, isLoading, refetch } = useOrganizations();
  const createOrgMutation = useCreateOrganization();

  const activeOrg = organizations?.find(o => o.slug === currentOrgSlug) || null;

  useEffect(() => {
    if (currentOrgSlug) {
      localStorage.setItem('organization_slug', currentOrgSlug);
    } else {
      localStorage.removeItem('organization_slug');
    }
  }, [currentOrgSlug]);

  const selectOrg = (slug) => {
    localStorage.removeItem('token'); // Clear old tenant token to prevent cross-tenant permission conflicts
    localStorage.setItem('organization_slug', slug); // Synchronously save to prevent race condition
    setCurrentOrgSlug(slug);
    window.location.reload();
  };

  const clearOrg = () => {
    setCurrentOrgSlug('');
    localStorage.removeItem('organization_slug');
    localStorage.removeItem('token'); // Clear token when switching back to workspace selection
    window.location.reload();
  };

  const createOrg = async (name, eventTitle, creatorEmail) => {
    const newOrg = await createOrgMutation.mutateAsync({ name, event_title: eventTitle, creator_email: creatorEmail });
    localStorage.removeItem('token'); // Clear old tenant token
    localStorage.setItem('organization_slug', newOrg.slug); // Synchronously save to prevent race condition
    setCurrentOrgSlug(newOrg.slug);
    window.location.href = '/login?register=true'; // Redirect to register as the admin of the new workspace
  };

  return (
    <OrganizationContext.Provider value={{
      organizations,
      activeOrg,
      currentOrgSlug,
      isLoading,
      selectOrg,
      clearOrg,
      createOrg,
      refetch
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
