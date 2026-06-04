-- Community post comments
CREATE TABLE IF NOT EXISTS "CommunityPostComments" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES "CommunityPosts"(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES "Communities"(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES "CommunityPostComments"(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_post_comments_post
  ON "CommunityPostComments"(post_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_community_post_comments_community
  ON "CommunityPostComments"(community_id);
