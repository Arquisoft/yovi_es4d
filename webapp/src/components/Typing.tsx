import { useEffect, useState } from 'react';

type Props = {
  text: string;
  speed?: number; // ms per character
  tag?: string;
  className?: string;
};

export default function Typing({ text, speed = 60, tag = 'h2', className = 'typing' }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= text.length) return;
    const id = setTimeout(() => setIndex((i) => i + 1), speed);
    return () => clearTimeout(id);
  }, [index, text, speed]);

  const Tag = tag as any;

  return (
    <Tag className={className} aria-live="polite">
      {text.slice(0, index)}
      <span className="typing-cursor" aria-hidden="true" />
    </Tag>
  );
}