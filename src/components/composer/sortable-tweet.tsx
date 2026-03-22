
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TweetCard } from "./tweet-card";

interface SortableTweetProps {
  id: string;
  tweet: any;
  index: number;
  totalTweets: number;
  updateTweet: (id: string, content: string) => void;
  updateTweetPreview?: ((id: string, preview: any) => void) | undefined;
  removeTweet: (id: string) => void;
  removeTweetMedia: (id: string, url: string) => void;
  triggerFileUpload: (id: string) => void;
  openAiTool: (tool: "thread" | "hook" | "cta" | "rewrite" | "translate" | "hashtags", tweetId?: string) => void;
  openAiImage?: (tweetId: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  suggestedHashtags?: string[];
  onHashtagClick?: (tag: string) => void;
}

export function SortableTweet({ id, tweet, index, totalTweets, updateTweet, updateTweetPreview, removeTweet, removeTweetMedia, triggerFileUpload, openAiTool, openAiImage, onMove, suggestedHashtags, onHashtagClick }: SortableTweetProps) {
  const isFirst = index === 0;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
        <TweetCard
            tweet={tweet}
            index={index}
            totalTweets={totalTweets}
            updateTweet={updateTweet}
            updateTweetPreview={updateTweetPreview}
            removeTweet={removeTweet}
            removeTweetMedia={removeTweetMedia}
            triggerFileUpload={triggerFileUpload}
            openAiTool={openAiTool}
            {...(openAiImage !== undefined && { openAiImage })}
            dragHandleProps={{...attributes, ...listeners}}
            isFirst={isFirst}
            {...(index > 0 && { onMoveUp: () => onMove(index, index - 1) })}
            {...(index < totalTweets - 1 && { onMoveDown: () => onMove(index, index + 1) })}
            {...(suggestedHashtags !== undefined && { suggestedHashtags })}
            {...(onHashtagClick !== undefined && { onHashtagClick })}
        />
    </div>
  );
}
