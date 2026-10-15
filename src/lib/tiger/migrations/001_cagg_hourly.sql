-- Migration: 001_cagg_hourly.sql
-- Description: Create hourly continuous aggregate and refresh policy for agent_events hypertable.
-- Target: Tiger Cloud / TimescaleDB (Service: ysa2cqiz8e, Database: db-68737)
-- Compatible with TimescaleDB >= 2.0 (Verified target version: 2.30.2)

-- 1. Create the continuous aggregate materialized view (idempotent)
CREATE MATERIALIZED VIEW IF NOT EXISTS agent_telemetry_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', created_at) AS bucket,
    agent_name,
    COUNT(*) AS total_actions,
    COUNT(*) FILTER (WHERE status = 'SUCCESS') AS success_count,
    COUNT(*) FILTER (WHERE status = 'FAILED') AS failure_count,
    ROUND(AVG(duration_ms)::numeric, 1) AS avg_duration_ms,
    MAX(duration_ms) AS max_duration_ms,
    COALESCE(SUM(tokens_used), 0) AS total_tokens,
    ROUND(AVG(tokens_used)::numeric, 1) AS avg_tokens
FROM agent_events
GROUP BY bucket, agent_name
WITH NO DATA;

-- 2. Create index on the materialized view for rapid time-range filtering
CREATE INDEX IF NOT EXISTS idx_agent_telemetry_hourly_bucket_agent
ON agent_telemetry_hourly (bucket DESC, agent_name);

-- 3. Register continuous aggregate policy (refresh every hour, looking back 30 days up to the latest completed hour)
SELECT add_continuous_aggregate_policy(
    continuous_aggregate => 'agent_telemetry_hourly',
    start_offset => INTERVAL '30 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => true
);

-- Documentation metadata comments
COMMENT ON VIEW agent_telemetry_hourly IS 
'Hourly continuous aggregate summarizing agent activity, latency percentiles, and token consumption from agent_events hypertable.';
