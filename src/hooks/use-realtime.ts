import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeConfig {
  table: string;
  schema?: string;
  filter?: string;
  onDataChange: () => void;
}

export function useRealtimeSubscription(configs: RealtimeConfig[], enabled: boolean = true) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const configsRef = useRef(configs);

  // Keep configs ref updated
  configsRef.current = configs;

  useEffect(() => {
    if (!enabled || configs.length === 0) return;

    // Create unique channel name
    const channelName = `realtime-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    let channel = supabase.channel(channelName);

    // Add listeners for each table
    configs.forEach(({ table, schema = 'public', filter, onDataChange }) => {
      const channelConfig: {
        event: '*';
        schema: string;
        table: string;
        filter?: string;
      } = {
        event: '*',
        schema,
        table,
      };

      if (filter) {
        channelConfig.filter = filter;
      }

      channel = channel.on(
        'postgres_changes',
        channelConfig,
        (payload) => {
          console.log(`[Realtime] ${table} changed:`, payload.eventType);
          onDataChange();
        }
      );
    });

    channel.subscribe((status) => {
      console.log(`[Realtime] Subscription status:`, status);
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('[Realtime] Cleaning up subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, configs.map(c => `${c.table}-${c.filter || ''}`).join(',')]);
}
