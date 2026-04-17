import Image from "next/image";
import { ViralScoreBadge } from "@/components/composer/viral-score-badge";
import { cn } from "@/lib/utils";

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  images?: string[];
  siteName?: string;
}

interface TweetDraft {
  id: string;
  content: string;
  media: Array<{
    url: string;
    mimeType: string;
    fileType: "image" | "video" | "gif";
    size: number;
    uploading?: boolean;
    placeholderId?: string;
  }>;
  linkPreview?: LinkPreview | null;
}

interface ComposerPreviewProps {
  tweets: TweetDraft[];
  previewTweet: TweetDraft | null;
  userImage?: string | null;
  userName: string;
  userHandle: string;
  session?: any;
}

export function ComposerPreview({
  tweets,
  previewTweet,
  userImage,
  userName,
  userHandle,
  session,
}: ComposerPreviewProps) {
  return (
    <div className="space-y-2 px-3 pt-3 sm:space-y-3 sm:px-6 sm:pt-5">
      <div className="mb-1.5 flex items-center justify-between sm:mb-2">
        <p className="text-muted-foreground/70 text-xs font-medium">Preview</p>
        <div className="flex items-center gap-1">
          {tweets.length > 1 && (
            <ViralScoreBadge
              content={tweets[0]?.content || ""}
              userPlan={(session?.user as any)?.plan || "free"}
            />
          )}
          {tweets.length <= 1 && (
            <ViralScoreBadge
              content={previewTweet?.content || ""}
              userPlan={(session?.user as any)?.plan || "free"}
            />
          )}
        </div>
      </div>
      <div
        className={cn(
          "bg-background rounded-md border p-3 sm:p-4",
          tweets.length > 1 && "max-h-[300px] overflow-y-auto sm:max-h-[400px]"
        )}
      >
        {tweets.length <= 1 ? (
          /* Single tweet preview */
          <div className="flex gap-2 sm:gap-3">
            <div className="bg-muted relative h-8 w-8 shrink-0 overflow-hidden rounded-full sm:h-10 sm:w-10">
              {userImage ? (
                <Image src={userImage} alt={userName} fill sizes="40px" className="object-cover" />
              ) : (
                <div className="bg-primary text-primary-foreground flex h-full w-full items-center justify-center font-bold">
                  {userName[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
            <div className="w-full min-w-0 space-y-0.5 sm:space-y-1">
              <div className="flex flex-col gap-0 text-xs sm:text-sm xl:flex-row xl:items-center xl:gap-1">
                <span className="truncate font-bold">{userName}</span>
                <span className="text-muted-foreground truncate">{userHandle}</span>
              </div>
              <p className="text-xs break-words whitespace-pre-wrap sm:text-sm">
                {previewTweet?.content || "Preview text will appear here..."}
              </p>
              {(previewTweet?.media?.length || 0) > 0 && previewTweet?.media?.[0]?.url && (
                <div className="mt-2 overflow-hidden rounded-lg border">
                  {previewTweet?.media?.[0]?.fileType === "video" &&
                  !previewTweet.media[0].url.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i) ? (
                    <video
                      src={previewTweet.media[0].url}
                      className="h-auto w-full"
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      crossOrigin="anonymous"
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <Image
                      src={previewTweet.media[0].url}
                      alt="Preview"
                      width={600}
                      height={400}
                      className="h-auto w-full"
                    />
                  )}
                </div>
              )}
              {previewTweet?.linkPreview && !previewTweet.media?.length && (
                <div className="mt-2 overflow-hidden rounded-md border">
                  {previewTweet.linkPreview.images?.[0] && (
                    <div className="relative h-48 w-full">
                      <Image
                        src={previewTweet.linkPreview.images[0]}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="bg-muted/20 p-3">
                    <h4 className="line-clamp-1 text-sm font-medium">
                      {previewTweet.linkPreview.title}
                    </h4>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                      {previewTweet.linkPreview.description}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs lowercase">
                      {new URL(previewTweet.linkPreview.url).hostname}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Thread preview — all tweets stacked with connecting lines */
          tweets.map((t, i) => (
            <div key={t.id}>
              {i > 0 && <div className="bg-muted-foreground/30 mx-auto h-3 w-0.5 sm:h-4" />}
              <div className="flex gap-2 sm:gap-3">
                <div className="bg-muted relative h-8 w-8 shrink-0 overflow-hidden rounded-full sm:h-10 sm:w-10">
                  {userImage ? (
                    <Image
                      src={userImage}
                      alt={userName}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="bg-primary text-primary-foreground flex h-full w-full items-center justify-center font-bold">
                      {userName[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <div className="w-full min-w-0 space-y-0.5 sm:space-y-1">
                  <div className="flex flex-col gap-0 text-xs sm:text-sm xl:flex-row xl:items-center xl:gap-1">
                    <span className="truncate font-bold">{userName}</span>
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="text-muted-foreground truncate">{userHandle}</span>
                      {tweets.length > 1 && (
                        <span className="text-muted-foreground/60 shrink-0 text-[10px] sm:text-xs">
                          {i + 1}/{tweets.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs break-words whitespace-pre-wrap sm:text-sm">
                    {t.content || "..."}
                  </p>
                  {t.media?.length > 0 && t.media?.[0]?.url && (
                    <div className="mt-2 overflow-hidden rounded-lg border">
                      {t.media[0].fileType === "video" &&
                      !t.media[0].url.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i) ? (
                        <video
                          src={t.media[0].url}
                          className="h-auto w-full"
                          controls
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          crossOrigin="anonymous"
                        >
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <Image
                          src={t.media[0].url}
                          alt="Preview"
                          width={600}
                          height={400}
                          className="h-auto w-full"
                        />
                      )}
                    </div>
                  )}
                  {t.linkPreview && !t.media?.length && (
                    <div className="mt-2 overflow-hidden rounded-md border">
                      {t.linkPreview.images?.[0] && (
                        <div className="relative h-48 w-full">
                          <Image
                            src={t.linkPreview.images[0]}
                            alt="Preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="bg-muted/20 p-3">
                        <h4 className="line-clamp-1 text-sm font-medium">{t.linkPreview.title}</h4>
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                          {t.linkPreview.description}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs lowercase">
                          {new URL(t.linkPreview.url).hostname}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
