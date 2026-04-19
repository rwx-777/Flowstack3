'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export interface Task {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'done';
  dueDate: string | null;
  assignedUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TasksResponse {
  tasks: Task[];
}

async function fetchTasks(): Promise<Task[]> {
  const { data } = await axios.get<TasksResponse>('/api/tasks');
  return data.tasks;
}

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; dueDate?: string; status?: string }) => {
      const { data } = await axios.post<Task>('/api/tasks', input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...update
    }: {
      id: string;
      title?: string;
      status?: 'open' | 'in_progress' | 'done';
      dueDate?: string;
      assignedUserId?: string;
    }) => {
      const { data } = await axios.patch<Task>(`/api/tasks/${id}`, update);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/tasks/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
