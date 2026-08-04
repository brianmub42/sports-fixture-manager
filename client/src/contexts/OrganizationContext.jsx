import { createContext, useContext, useState, useEffect } from 'react';
import { useOrganizations, useCreateOrganization } from '../hooks/useFixtures.js';

const OrganizationContext = createContext(null);

export function OrganizationProvider({ children }) {
  const [currentOrgSlug, setCurrentOrgSlug] = useState(() => {
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
    setCurrentOrgSlug(slug);
    // Reload page or refetch queries to apply headers
    window.location.reload();
  };

  const clearOrg = () => {
    setCurrentOrgSlug('');
    localStorage.removeItem('organization_slug');
    window.location.reload();
  };

  const createOrg = async (name, eventTitle) => {
    const newOrg = await createOrgMutation.mutateAsync({ name, event_title: eventTitle });
    setCurrentOrgSlug(newOrg.slug);
    window.location.reload();
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
