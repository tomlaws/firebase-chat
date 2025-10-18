<script lang="ts">
    let { children } = $props();
    const data = {
        conversation: {
            username: "John Doe",
            avatarUrl: "/avatars/johndoe.png",
            lastSeen: "Online 5 minutes ago",
        },
    };
    const convo = data?.conversation ?? {};
    const AVATAR_FALLBACK = "/default-avatar.png";
</script>

<header class="header" role="banner">
    <img
        class="avatar"
        src={convo.avatarUrl ?? AVATAR_FALLBACK}
        alt={convo.username
            ? `${convo.username} avatar`
            : "Conversation avatar"}
        loading="lazy"
    />
    <div class="meta">
        <div class="username">{convo.username ?? "Unknown"}</div>
        <div class="lastseen">{convo.lastSeen ?? ""}</div>
    </div>
</header>

{@render children?.()}

<style>
    :global(body) {
        margin: 0;
    }

    .header {
        height: 64px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 16px;
        background: var(--surface, #fff);
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        z-index: 20;
        box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
    }

    .avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
        flex: 0 0 48px;
        background: #eee;
    }

    .meta {
        display: flex;
        flex-direction: column;
        justify-content: center;
        overflow: hidden;
    }

    .username {
        font-weight: 600;
        font-size: 1rem;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
    }

    .lastseen {
        font-size: 0.85rem;
        color: #6b7280; /* gray */
        margin-top: 2px;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
    }

    /* content sits below the fixed header */
    .content {
        padding-top: 64px; /* same as header height */
        min-height: calc(100vh - 64px);
    }
</style>
