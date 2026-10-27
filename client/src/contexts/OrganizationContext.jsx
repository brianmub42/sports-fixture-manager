import { createContext, useContext, useState, useEffect } from 'react';
import { useOrganizations, useCreateOrganization } from '../hooks/useFixtures.js';
import { useQuery } from '@tanstack/react-query';
import { organizationsApi, authApi } from '../api.js';

const OrganizationContext = createContext(null);

export function OrganizationProvider({ children }) {
  const [currentOrgSlug, setCurrentOrgSlug] = useState(() => {
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'watch' && pathParts[2]) {
      const pathSlug = pathParts[2];
      localStorage.setItem('organization_slug', pathSlug);
      return pathSlug;
    }

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

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;

  // Query all tournaments belonging to this account / official
  const { data: myTournaments, refetch: refetchMyTournaments } = useQuery({
    queryKey: ['my-tournaments', token, currentOrgSlug],
    queryFn: async () => {
      const authToken = localStorage.getItem('token');
      if (!authToken) return [];
      try {
        const res = await organizationsApi.getMyTournaments();
        return res.data || [];
      } catch (err) {
        return [];
      }
    },
    enabled: !!token
  });

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

  const setActiveOrgSlug = (slug) => {
    localStorage.setItem('organization_slug', slug);
    setCurrentOrgSlug(slug);
  };

  // Switch tournament without losing authentication
  const switchTournament = async (slug) => {
    try {
      const res = await authApi.switchTournament(slug);
      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
      }
      localStorage.setItem('organization_slug', slug);
      setCurrentOrgSlug(slug);
      window.location.reload();
    } catch (err) {
      console.warn('Switch tournament without token fallback:', err);
      selectOrg(slug);
    }
  };

  // Create next tournament under current account
  const createNextTournament = async (tournamentData) => {
    const res = await organizationsApi.createTournament(tournamentData);
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
    }
    if (res.data?.organization?.slug) {
      localStorage.setItem('organization_slug', res.data.organization.slug);
      setCurrentOrgSlug(res.data.organization.slug);
    }
    window.location.reload();
    return res.data;
  };

  const createOrg = async (nameOrPayload, eventTitle, creatorEmail, adminName, password) => {
    let payload;
    if (typeof nameOrPayload === 'object' && nameOrPayload !== null) {
      payload = nameOrPayload;
    } else {
      payload = {
        name: nameOrPayload,
        event_title: eventTitle,
        creator_email: creatorEmail,
        admin_name: adminName,
        password: password
      };
    }

    const res = await createOrgMutation.mutateAsync(payload);
    const newOrg = res.organization || res;
    const token = res.token;

    if (token) {
      localStorage.setItem('token', token);
    }
    if (newOrg?.slug) {
      localStorage.setItem('organization_slug', newOrg.slug);
      setCurrentOrgSlug(newOrg.slug);
    }

    // Immediately enter dashboard as authenticated administrator
    window.location.href = `/?workspace=${newOrg.slug}`;
    return res;
  };

  return (
    <OrganizationContext.Provider value={{
      organizations,
      myTournaments: myTournaments || [],
      activeOrg,
      currentOrgSlug,
      isLoading,
      selectOrg,
      setActiveOrgSlug,
      clearOrg,
      createOrg,
      switchTournament,
      createNextTournament,
      refetchMyTournaments,
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
