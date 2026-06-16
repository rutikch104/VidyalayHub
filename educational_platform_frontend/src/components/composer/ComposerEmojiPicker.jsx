import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    label: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤔', '🤐', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🥺', '😢', '😭', '😤', '😡', '🤬', '😱', '😨', '😰', '😥', '😓'],
  },
  {
    id: 'gestures',
    label: 'Gestures',
    emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🙏', '✍️', '💅', '🤳', '💃', '🕺', '👏', '🙌', '👐', '🤲', '🤝', '🫶', '🫡', '🙆', '💁', '🙋', '🙇', '🤦', '🤷'],
  },
  {
    id: 'hearts',
    label: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '✨', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🔥', '⭐', '🌟', '💯', '✅', '☑️', '✔️', '👀', '💡', '🚀'],
  },
  {
    id: 'school',
    label: 'Campus',
    emojis: ['📚', '📖', '📝', '✏️', '🖊️', '📌', '📎', '🗂️', '📁', '📂', '💻', '🖥️', '⌨️', '🧑‍💻', '👨‍🏫', '👩‍🏫', '🎓', '🏫', '🏛️', '🧪', '🔬', '🧬', '📐', '📏', '🧮', '📊', '📈', '🗓️', '⏰', '☕', '🍕', '🍔', '🥗', '🧃'],
  },
  {
    id: 'nature',
    label: 'Nature',
    emojis: ['🌞', '🌝', '🌛', '🌜', '⭐', '🌟', '💫', '☀️', '🌤️', '⛅', '🌈', '☁️', '🌧️', '⛈️', '❄️', '🌊', '🌍', '🌎', '🌏', '🌱', '🌿', '🍀', '🌸', '🌺', '🌻', '🌹', '🌷', '🍁', '🍂', '🐶', '🐱', '🐻', '🦊', '🐼', '🦁', '🐯'],
  },
];

export default function ComposerEmojiPicker({ onSelect, children, className }) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('smileys');

  const category = EMOJI_CATEGORIES.find(c => c.id === activeCategory) ?? EMOJI_CATEGORIES[0];

  const handleSelect = (emoji) => {
    onSelect?.(emoji);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        className={cn('feed-composer-emoji w-[min(20rem,calc(100vw-2rem))] p-0', className)}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="feed-composer-emoji__tabs" role="tablist" aria-label="Emoji categories">
          {EMOJI_CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeCategory === id}
              className={cn(
                'feed-composer-emoji__tab',
                activeCategory === id && 'feed-composer-emoji__tab--active',
              )}
              onClick={() => setActiveCategory(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className="feed-composer-emoji__grid"
          role="grid"
          aria-label={`${category.label} emojis`}
        >
          {category.emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="feed-composer-emoji__item"
              aria-label={`Insert ${emoji}`}
              onClick={() => handleSelect(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
