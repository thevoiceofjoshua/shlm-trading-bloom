export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string
          email: string
          experience: string | null
          full_name: string
          goals: string | null
          id: string
          payment_link_sent_at: string | null
          payment_link_session_id: string | null
          payment_link_status: string
          phone: string | null
          referred_by_name: string | null
          referred_by_recruiter_id: string | null
          scheduled_at: string
          status: string
          tier: string
          timezone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          experience?: string | null
          full_name: string
          goals?: string | null
          id?: string
          payment_link_sent_at?: string | null
          payment_link_session_id?: string | null
          payment_link_status?: string
          phone?: string | null
          referred_by_name?: string | null
          referred_by_recruiter_id?: string | null
          scheduled_at: string
          status?: string
          tier: string
          timezone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          experience?: string | null
          full_name?: string
          goals?: string | null
          id?: string
          payment_link_sent_at?: string | null
          payment_link_session_id?: string | null
          payment_link_status?: string
          phone?: string | null
          referred_by_name?: string | null
          referred_by_recruiter_id?: string | null
          scheduled_at?: string
          status?: string
          tier?: string
          timezone?: string | null
        }
        Relationships: []
      }
      bible_memberships: {
        Row: {
          active: boolean
          blocked: boolean
          display_name: string | null
          joined_at: string
          muted_until: string | null
          notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          blocked?: boolean
          display_name?: string | null
          joined_at?: string
          muted_until?: string | null
          notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          blocked?: boolean
          display_name?: string | null
          joined_at?: string
          muted_until?: string | null
          notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bible_messages: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          pinned: boolean
          removed: boolean
          reply_to: string | null
          submission_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name: string
          body: string
          created_at?: string
          id?: string
          pinned?: boolean
          removed?: boolean
          reply_to?: string | null
          submission_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          removed?: boolean
          reply_to?: string | null
          submission_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bible_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "bible_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          message_id: string | null
          read_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          message_id?: string | null
          read_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          message_id?: string | null
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bible_notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "bible_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_reactions: {
        Row: {
          created_at: string
          message_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          message_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          message_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bible_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "bible_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_teachings: {
        Row: {
          created_at: string
          created_by: string
          description: string
          duration_seconds: number | null
          featured: boolean
          file_size: number | null
          id: string
          media_type: string | null
          mux_asset_id: string | null
          mux_upload_id: string | null
          playback_id: string | null
          published: boolean
          scripture: string
          state: string
          thumbnail_path: string | null
          title: string
          updated_at: string
          upload_claimed_at: string | null
          upload_reservation: string | null
          video_path: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          duration_seconds?: number | null
          featured?: boolean
          file_size?: number | null
          id?: string
          media_type?: string | null
          mux_asset_id?: string | null
          mux_upload_id?: string | null
          playback_id?: string | null
          published?: boolean
          scripture?: string
          state?: string
          thumbnail_path?: string | null
          title: string
          updated_at?: string
          upload_claimed_at?: string | null
          upload_reservation?: string | null
          video_path?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          duration_seconds?: number | null
          featured?: boolean
          file_size?: number | null
          id?: string
          media_type?: string | null
          mux_asset_id?: string | null
          mux_upload_id?: string | null
          playback_id?: string | null
          published?: boolean
          scripture?: string
          state?: string
          thumbnail_path?: string | null
          title?: string
          updated_at?: string
          upload_claimed_at?: string | null
          upload_reservation?: string | null
          video_path?: string | null
        }
        Relationships: []
      }
      daily_levels: {
        Row: {
          computed_at: string
          id: string
          instrument: string
          levels: Json
          session_date: string
        }
        Insert: {
          computed_at?: string
          id?: string
          instrument: string
          levels: Json
          session_date: string
        }
        Update: {
          computed_at?: string
          id?: string
          instrument?: string
          levels?: Json
          session_date?: string
        }
        Relationships: []
      }
      forecast_outcomes: {
        Row: {
          actual: Json
          created_at: string
          horizon_minutes: number
          id: string
          observed_at: string
          snapshot_id: string
        }
        Insert: {
          actual: Json
          created_at?: string
          horizon_minutes: number
          id?: string
          observed_at: string
          snapshot_id: string
        }
        Update: {
          actual?: Json
          created_at?: string
          horizon_minutes?: number
          id?: string
          observed_at?: string
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_outcomes_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "forecast_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_snapshots: {
        Row: {
          id: string
          inputs: Json
          instrument: string
          issued_at: string
          model_version: string
          output: Json
          reason: string
          scheduled_at: string
          session_date: string
          slot: string
          status: string
        }
        Insert: {
          id?: string
          inputs: Json
          instrument: string
          issued_at?: string
          model_version: string
          output: Json
          reason: string
          scheduled_at: string
          session_date: string
          slot: string
          status: string
        }
        Update: {
          id?: string
          inputs?: Json
          instrument?: string
          issued_at?: string
          model_version?: string
          output?: Json
          reason?: string
          scheduled_at?: string
          session_date?: string
          slot?: string
          status?: string
        }
        Relationships: []
      }
      forecast_validations: {
        Row: {
          calibrated: boolean
          cutoff: string
          evaluated_at: string
          id: string
          instrument: string
          method: string
          metrics: Json
          model_version: string
          sample_size: number
        }
        Insert: {
          calibrated?: boolean
          cutoff: string
          evaluated_at?: string
          id?: string
          instrument: string
          method: string
          metrics: Json
          model_version: string
          sample_size: number
        }
        Update: {
          calibrated?: boolean
          cutoff?: string
          evaluated_at?: string
          id?: string
          instrument?: string
          method?: string
          metrics?: Json
          model_version?: string
          sample_size?: number
        }
        Relationships: []
      }
      guard_sessions: {
        Row: {
          created_at: string
          id: string
          lock_reason: string | null
          locked_at: string | null
          note_date: string
          period: string
          session_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lock_reason?: string | null
          locked_at?: string | null
          note_date: string
          period: string
          session_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lock_reason?: string | null
          locked_at?: string | null
          note_date?: string
          period?: string
          session_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      guard_trades: {
        Row: {
          account: string
          created_at: string
          direction: string
          id: string
          instrument: string
          note: string
          occurred_at: string
          outcome: string
          pnl: number
          session_id: string
          undone_at: string | null
          user_id: string
        }
        Insert: {
          account?: string
          created_at?: string
          direction?: string
          id: string
          instrument: string
          note?: string
          occurred_at?: string
          outcome: string
          pnl: number
          session_id: string
          undone_at?: string | null
          user_id: string
        }
        Update: {
          account?: string
          created_at?: string
          direction?: string
          id?: string
          instrument?: string
          note?: string
          occurred_at?: string
          outcome?: string
          pnl?: number
          session_id?: string
          undone_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guard_trades_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "guard_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_request_events: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          previous_status: string | null
          request_id: string
          status: string
          user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          previous_status?: string | null
          request_id: string
          status: string
          user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          previous_status?: string | null
          request_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicator_request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "indicator_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_requests: {
        Row: {
          created_at: string
          id: string
          indicator_id: string
          indicator_name: string
          member_email: string
          member_name: string
          note: string
          notification_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_id: string
          tradingview_username: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          indicator_id: string
          indicator_name: string
          member_email?: string
          member_name?: string
          note?: string
          notification_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_id: string
          tradingview_username: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          indicator_id?: string
          indicator_name?: string
          member_email?: string
          member_name?: string
          note?: string
          notification_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_id?: string
          tradingview_username?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicator_requests_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          description: string
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          description?: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          description?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      journal_vault_passcodes: {
        Row: {
          created_at: string
          id: string
          passcode_hash: string
          passcode_length: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          passcode_hash: string
          passcode_length?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          passcode_hash?: string
          passcode_length?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          note_date: string
          session: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          note_date: string
          session: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          note_date?: string
          session?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_readiness: {
        Row: {
          checks: Json
          created_at: string
          id: string
          ready_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checks?: Json
          created_at?: string
          id?: string
          ready_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checks?: Json
          created_at?: string
          id?: string
          ready_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_rules: {
        Row: {
          consequence: string
          created_at: string
          id: string
          rules: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          consequence?: string
          created_at?: string
          id?: string
          rules?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          consequence?: string
          created_at?: string
          id?: string
          rules?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_total: number | null
          created_at: string
          currency: string | null
          email: string
          id: string
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string
          tier: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_total?: number | null
          created_at?: string
          currency?: string | null
          email: string
          id?: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id: string
          tier: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_total?: number | null
          created_at?: string
          currency?: string | null
          email?: string
          id?: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string
          tier?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      recruiter_bank_accounts: {
        Row: {
          bank_name: string | null
          country: string | null
          created_at: string
          currency: string
          holder_name: string
          id: string
          last4: string | null
          mode: string
          recruiter_id: string
          updated_at: string
          wise_recipient_id: number
        }
        Insert: {
          bank_name?: string | null
          country?: string | null
          created_at?: string
          currency: string
          holder_name: string
          id?: string
          last4?: string | null
          mode: string
          recruiter_id: string
          updated_at?: string
          wise_recipient_id: number
        }
        Update: {
          bank_name?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          holder_name?: string
          id?: string
          last4?: string | null
          mode?: string
          recruiter_id?: string
          updated_at?: string
          wise_recipient_id?: number
        }
        Relationships: []
      }
      recruiter_lands: {
        Row: {
          application_id: string | null
          created_at: string
          created_by: string | null
          delta: number
          id: string
          month: string
          recruiter_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          month: string
          recruiter_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          month?: string
          recruiter_id?: string
        }
        Relationships: []
      }
      recruiter_payouts: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          currency: string
          customer_transaction_id: string
          error: string | null
          fee: number | null
          id: string
          mode: string
          quote_id: string | null
          rate: number | null
          recruiter_id: string
          status: string
          target_amount: number | null
          target_currency: string | null
          updated_at: string
          wise_status: string | null
          wise_transfer_id: number | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_transaction_id?: string
          error?: string | null
          fee?: number | null
          id?: string
          mode: string
          quote_id?: string | null
          rate?: number | null
          recruiter_id: string
          status?: string
          target_amount?: number | null
          target_currency?: string | null
          updated_at?: string
          wise_status?: string | null
          wise_transfer_id?: number | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_transaction_id?: string
          error?: string | null
          fee?: number | null
          id?: string
          mode?: string
          quote_id?: string | null
          rate?: number | null
          recruiter_id?: string
          status?: string
          target_amount?: number | null
          target_currency?: string | null
          updated_at?: string
          wise_status?: string | null
          wise_transfer_id?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author: string
          created_at: string
          id: string
          published: boolean
          quote: string
          rating: number
          role: string
          sort_order: number
          verified: boolean
        }
        Insert: {
          author: string
          created_at?: string
          id?: string
          published?: boolean
          quote: string
          rating?: number
          role?: string
          sort_order?: number
          verified?: boolean
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          published?: boolean
          quote?: string
          rating?: number
          role?: string
          sort_order?: number
          verified?: boolean
        }
        Relationships: []
      }
      seasonality_calendar: {
        Row: {
          created_at: string
          date: string
          first_trading_day: boolean
          is_trading_day: boolean
          jobs_report: boolean
          last_trading_day: boolean
          options_expiry: boolean
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          first_trading_day?: boolean
          is_trading_day: boolean
          jobs_report?: boolean
          last_trading_day?: boolean
          options_expiry?: boolean
          source: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          first_trading_day?: boolean
          is_trading_day?: boolean
          jobs_report?: boolean
          last_trading_day?: boolean
          options_expiry?: boolean
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      seasonality_history: {
        Row: {
          character: string
          close: number
          created_at: string
          date: string
          estimated: boolean
          high: number
          id: string
          low: number
          open: number
          source: string
          symbol: string
          tradability_evidence: string | null
          tradable: boolean | null
          updated_at: string
          volume: number
        }
        Insert: {
          character: string
          close: number
          created_at?: string
          date: string
          estimated?: boolean
          high: number
          id?: string
          low: number
          open: number
          source: string
          symbol: string
          tradability_evidence?: string | null
          tradable?: boolean | null
          updated_at?: string
          volume: number
        }
        Update: {
          character?: string
          close?: number
          created_at?: string
          date?: string
          estimated?: boolean
          high?: number
          id?: string
          low?: number
          open?: number
          source?: string
          symbol?: string
          tradability_evidence?: string | null
          tradable?: boolean | null
          updated_at?: string
          volume?: number
        }
        Relationships: []
      }
      seasonality_month_coverage: {
        Row: {
          complete: boolean
          created_at: string
          month: number
          source: string
          symbol: string
          updated_at: string
          year: number
        }
        Insert: {
          complete?: boolean
          created_at?: string
          month: number
          source: string
          symbol: string
          updated_at?: string
          year: number
        }
        Update: {
          complete?: boolean
          created_at?: string
          month?: number
          source?: string
          symbol?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      session_reviews: {
        Row: {
          created_at: string
          id: string
          payload: Json
          review_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          review_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          review_date?: string
          user_id?: string
        }
        Relationships: []
      }
      site_stats: {
        Row: {
          cohort_label: string
          cohort_value: string
          hero_note: string
          id: number
          performance_note: string
          performance_value: string
          results_label: string
          results_value: string
          updated_at: string
        }
        Insert: {
          cohort_label?: string
          cohort_value?: string
          hero_note?: string
          id?: number
          performance_note?: string
          performance_value?: string
          results_label?: string
          results_value?: string
          updated_at?: string
        }
        Update: {
          cohort_label?: string
          cohort_value?: string
          hero_note?: string
          id?: number
          performance_note?: string
          performance_value?: string
          results_label?: string
          results_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      tradovate_connections: {
        Row: {
          access_token_cipher: string | null
          access_token_iv: string | null
          account_id: number | null
          account_name: string | null
          created_at: string
          credentials_cipher: string
          credentials_iv: string
          environment: string
          id: string
          label: string | null
          last_used_at: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_cipher?: string | null
          access_token_iv?: string | null
          account_id?: number | null
          account_name?: string | null
          created_at?: string
          credentials_cipher: string
          credentials_iv: string
          environment?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_cipher?: string | null
          access_token_iv?: string | null
          account_id?: number | null
          account_name?: string | null
          created_at?: string
          credentials_cipher?: string
          credentials_iv?: string
          environment?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_passkeys: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_label: string
          id: string
          last_used_at: string | null
          public_key: string
          transports: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_label?: string
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_label?: string
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          kind: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at?: string
          id?: string
          kind: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          user_id?: string | null
        }
        Relationships: []
      }
      weekly_behavior_events: {
        Row: {
          created_at: string
          event_key: string
          id: string
          kind: string
          message: string
          session_date: string
          weekday: number
        }
        Insert: {
          created_at?: string
          event_key: string
          id?: string
          kind: string
          message: string
          session_date: string
          weekday: number
        }
        Update: {
          created_at?: string
          event_key?: string
          id?: string
          kind?: string
          message?: string
          session_date?: string
          weekday?: number
        }
        Relationships: []
      }
      weekly_behavior_state: {
        Row: {
          created_at: string
          last_bar_ts: number
          reading: Json
          session_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          last_bar_ts?: number
          reading?: Json
          session_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          last_bar_ts?: number
          reading?: Json
          session_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      wise_connection: {
        Row: {
          connected_at: string
          id: string
          mode: string
          profile_id: number
          profile_name: string | null
          token_cipher: string
          token_iv: string
          updated_at: string
        }
        Insert: {
          connected_at?: string
          id?: string
          mode: string
          profile_id: number
          profile_name?: string | null
          token_cipher: string
          token_iv: string
          updated_at?: string
        }
        Update: {
          connected_at?: string
          id?: string
          mode?: string
          profile_id?: number
          profile_name?: string | null
          token_cipher?: string
          token_iv?: string
          updated_at?: string
        }
        Relationships: []
      }
      wise_settings: {
        Row: {
          active_mode: string
          id: number
          sandbox_verified_at: string | null
          updated_at: string
        }
        Insert: {
          active_mode?: string
          id?: number
          sandbox_verified_at?: string | null
          updated_at?: string
        }
        Update: {
          active_mode?: string
          id?: number
          sandbox_verified_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_indicators: { Args: never; Returns: boolean }
      can_read_seasonality: { Args: never; Returns: boolean }
      claim_bible_upload: {
        Args: {
          p_actor: string
          p_id: string
          p_provider_count: number
          p_token: string
        }
        Returns: boolean
      }
      commit_guard_trade: {
        Args: {
          p_account: string
          p_direction: string
          p_id: string
          p_instrument: string
          p_note: string
          p_outcome: string
          p_pnl: number
          p_session: string
          p_user: string
        }
        Returns: {
          account: string
          created_at: string
          direction: string
          id: string
          instrument: string
          note: string
          occurred_at: string
          outcome: string
          pnl: number
          session_id: string
          undone_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "guard_trades"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guard_period: {
        Args: { p_now: string }
        Returns: {
          note_date: string
          period: string
          session_key: string
          window_open: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_bible_member: { Args: never; Returns: boolean }
      manage_indicator: {
        Args: {
          p_active: boolean
          p_actor: string
          p_description: string
          p_expected: string
          p_id: string
          p_name: string
        }
        Returns: {
          active: boolean
          created_at: string
          created_by: string
          description: string
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "indicators"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_weekly_behavior_tick: {
        Args: {
          p_candidates: Json
          p_date: string
          p_last_bar_ts: number
          p_reading: Json
          p_weekday: number
        }
        Returns: undefined
      }
      reorder_indicators: {
        Args: { p_actor: string; p_ids: string[] }
        Returns: undefined
      }
      reserve_recruiter_payout: {
        Args: {
          p_amount_cents: number
          p_bonus_cents: number
          p_bonus_per: number
          p_created_by: string
          p_mode: string
          p_rate_cents: number
          p_recruiter: string
        }
        Returns: string
      }
      review_indicator_request: {
        Args: { p_actor: string; p_id: string; p_status: string }
        Returns: {
          created_at: string
          id: string
          indicator_id: string
          indicator_name: string
          member_email: string
          member_name: string
          note: string
          notification_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_id: string
          tradingview_username: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "indicator_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_journal_entry: {
        Args: {
          p_body: string
          p_date: string
          p_expected: string
          p_new_key: string
          p_old_key: string
        }
        Returns: string
      }
      save_journal_entry_confirmed: {
        Args: {
          p_body: string
          p_date: string
          p_expected: string
          p_new_key: string
          p_old_key: string
        }
        Returns: Json
      }
      send_bible_message: {
        Args: {
          p_body: string
          p_name: string
          p_reply: string
          p_submission: string
          p_user: string
        }
        Returns: {
          author_name: string
          body: string
          created_at: string
          id: string
          pinned: boolean
          removed: boolean
          reply_to: string | null
          submission_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bible_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_indicator_request: {
        Args: {
          p_indicator: string
          p_note: string
          p_submission: string
          p_user: string
          p_username: string
        }
        Returns: {
          created_at: string
          id: string
          indicator_id: string
          indicator_name: string
          member_email: string
          member_name: string
          note: string
          notification_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_id: string
          tradingview_username: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "indicator_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      undo_guard_trade: {
        Args: { p_id: string; p_user: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "shlm_mod" | "free_member" | "recruiter"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "shlm_mod", "free_member", "recruiter"],
    },
  },
} as const
