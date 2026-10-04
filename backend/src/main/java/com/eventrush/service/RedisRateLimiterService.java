package com.eventrush.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * Same token-bucket IDEA as RateLimiterService, but the bucket now
 * lives in Redis instead of a local ConcurrentHashMap.
 *
 * WHY THIS MATTERS: imagine 3 app instances behind a load balancer.
 * With the old in-memory version, a user could get 5 tokens on
 * instance A, ALSO get 5 more tokens on instance B (different map,
 * doesn't know about A), and ALSO 5 more on instance C. Same user,
 * 15 allowed attempts instead of 5 - the rate limit is basically
 * broken the moment you scale horizontally.
 *
 * Redis fixes this because all 3 instances talk to the SAME Redis
 * server, so they all see and update the SAME counter for that user.
 *
 * WHY A LUA SCRIPT (not just separate INCR + EXPIRE calls):
 * "check tokens, then decrement" is two round-trips to Redis. Between
 * those two round-trips, another request (on another thread, maybe
 * another instance) could sneak in - the EXACT SAME race condition
 * shape as our seat-booking bug, just happening inside the rate
 * limiter this time! Redis runs Lua scripts atomically (as a single
 * operation), so "check + decrement" becomes one indivisible step,
 * same principle as our pessimistic DB lock.
 */
@Service
public class RedisRateLimiterService {

    private static final int MAX_TOKENS = 5;
    private static final int REFILL_INTERVAL_SECONDS = 2; // 1 token every 2 seconds
    private static final int WINDOW_TTL_SECONDS = 30;      // safety cleanup if user goes idle

    @Autowired
    private StringRedisTemplate redisTemplate;

    // This script runs ATOMICALLY inside Redis - no other command can
    // interleave in the middle of it, even under massive concurrency.
    private static final String TOKEN_BUCKET_SCRIPT = """
        local key = KEYS[1]
        local max_tokens = tonumber(ARGV[1])
        local refill_interval = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local ttl = tonumber(ARGV[4])

        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket[1])
        local last_refill = tonumber(bucket[2])

        if tokens == nil then
            tokens = max_tokens
            last_refill = now
        end

        local elapsed = now - last_refill
        local tokens_to_add = math.floor(elapsed / refill_interval)
        if tokens_to_add > 0 then
            tokens = math.min(max_tokens, tokens + tokens_to_add)
            last_refill = now
        end

        local allowed = 0
        if tokens > 0 then
            tokens = tokens - 1
            allowed = 1
        end

        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
        redis.call('EXPIRE', key, ttl)

        return allowed
        """;

    private final DefaultRedisScript<Long> script;

    public RedisRateLimiterService() {
        this.script = new DefaultRedisScript<>();
        this.script.setScriptText(TOKEN_BUCKET_SCRIPT);
        this.script.setResultType(Long.class);
    }

    public boolean tryConsume(Long userId) {
        String key = "eventrush:ratelimit:" + userId;
        long now = System.currentTimeMillis() / 1000;

        List<String> keys = Collections.singletonList(key);
        Long allowed = redisTemplate.execute(
                script,
                keys,
                String.valueOf(MAX_TOKENS),
                String.valueOf(REFILL_INTERVAL_SECONDS),
                String.valueOf(now),
                String.valueOf(WINDOW_TTL_SECONDS)
        );

        return allowed != null && allowed == 1L;
    }
}
