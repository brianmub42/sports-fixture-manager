import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi, fixturesApi } from '../api.js';

export function usePlayers(teamId, districtId) {
  const activeId = teamId || districtId;
  return useQuery({
    queryKey: ['players', activeId],
    queryFn: async () => {
      if (!activeId) return [];
      const res = await teamsApi.getPlayers(activeId);
      return res.data;
    },
    enabled: !!activeId
  });
}

export function useAddPlayer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ teamId, districtId, player }) => {
      const activeId = teamId || districtId;
      const res = await teamsApi.addPlayer(activeId, player);
      return res.data;
    },
    onSuccess: (_, variables) => {
      const activeId = variables.teamId || variables.districtId;
      queryClient.invalidateQueries({ queryKey: ['players', activeId] });
    }
  });
}

export function useDeletePlayer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ teamId, districtId, playerId }) => {
      const activeId = teamId || districtId;
      const res = await teamsApi.deletePlayer(activeId, playerId);
      return res.data;
    },
    onSuccess: (_, variables) => {
      const activeId = variables.teamId || variables.districtId;
      queryClient.invalidateQueries({ queryKey: ['players', activeId] });
    }
  });
}

export function useLineups(fixtureId) {
  return useQuery({
    queryKey: ['lineups', fixtureId],
    queryFn: async () => {
      if (!fixtureId) return [];
      const res = await fixturesApi.getLineups(fixtureId);
      return res.data;
    },
    enabled: !!fixtureId
  });
}

export function useSaveLineup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ fixtureId, teamId, playerIds }) => {
      const res = await fixturesApi.saveLineup(fixtureId, { teamId, playerIds });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lineups', variables.fixtureId] });
    }
  });
}
