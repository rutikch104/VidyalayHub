// @ts-nocheck
import SocialComposer from '@/components/social/SocialComposer';

/** Teacher Center answer composer — teachers-only @mentions + platform hashtags. */
export default function TcSocialComposer(props) {
  return (
    <SocialComposer
      mentionMode="teachers"
      variant="boxed"
      placeholder="Share knowledge — use @ to tag teachers, # for topics…"
      submitLabel="Post answer"
      {...props}
    />
  );
}
