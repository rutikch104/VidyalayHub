import { useMemo } from 'react';
import RichPostText from '@/components/RichPostText';
import CodeSnippetBlock from '@/components/code/CodeSnippetBlock';
import { getCodePostParts, isCodePost } from '@/lib/codePostMeta';
import { contentWithoutHashtags } from '@/utils/socialText';
import { cn } from '@/lib/utils';

export { isCodePost };

export default function CodePostContent({
  post,
  descriptionClassName = 'feed-post__content',
  mentionUserMap = null,
  tagsSlot = null,
  className,
}) {
  const parts = useMemo(
    () => getCodePostParts(post),
    [post?.content, post?.type, post?.code_language, post?.codeLanguage, post?.code_file_name, post?.codeFileName],
  );

  if (!parts) return null;

  const descriptionText = parts.description
    ? contentWithoutHashtags(parts.description)
    : '';

  return (
    <div className={cn('code-post-content', className)}>
      {descriptionText ? (
        <RichPostText
          text={descriptionText}
          className={descriptionClassName}
          mentionUserMap={mentionUserMap}
        />
      ) : null}

      {tagsSlot ? (
        <div className={cn('code-post-content__tags', descriptionText && 'code-post-content__tags--spaced')}>
          {tagsSlot}
        </div>
      ) : null}

      <div
        className={cn(
          'code-post-content__snippet',
          (descriptionText || tagsSlot) && 'code-post-content__snippet--spaced',
        )}
      >
        <CodeSnippetBlock
          content={parts.code}
          language={parts.language}
          fileName={parts.fileName}
        />
      </div>
    </div>
  );
}
