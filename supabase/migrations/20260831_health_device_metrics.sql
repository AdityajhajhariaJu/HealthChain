
CREATE TABLE IF NOT EXISTS public.user_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL,
    value NUMERIC NOT NULL,
    unit TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    source_device TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, metric_type, start_time, end_time)
);
CREATE INDEX IF NOT EXISTS idx_user_health_metrics_type_time ON public.user_health_metrics(user_id, metric_type, start_time DESC);

ALTER TABLE public.user_health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own health metrics" 
    ON public.user_health_metrics FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own health metrics" 
    ON public.user_health_metrics FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health metrics" 
    ON public.user_health_metrics FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own health metrics" 
    ON public.user_health_metrics FOR DELETE 
    USING (auth.uid() = user_id);
