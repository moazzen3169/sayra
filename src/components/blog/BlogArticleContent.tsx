
import React from "react";

type UnknownRecord = Record<string, unknown>;

interface BlogArticleContentProps {
  blocks: unknown[];
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getString(
  record: UnknownRecord,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function getNumber(
  record: UnknownRecord,
  key: string,
  fallback: number
): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

/** Only allow web URLs and safe relative paths. */
function safeUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const url = value.trim();

  if (
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes("\\")
  ) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return url;
    }
  } catch {
    return null;
  }

  return null;
}

function externalUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? value
      : null;
  } catch {
    return null;
  }
}

function RichTextNodes({ nodes }: { nodes: unknown[] }) {
  return (
    <>
      {nodes.map((rawNode, index) => {
        if (!isRecord(rawNode)) {
          return typeof rawNode === "string" ? (
            <React.Fragment key={index}>{rawNode}</React.Fragment>
          ) : null;
        }

        const type = asString(rawNode.type, "text");
        const value = asString(rawNode.value);
        const children = asArray(rawNode.children);
        const content = children.length > 0 ? (
          <RichTextNodes nodes={children} />
        ) : (
          value
        );

        switch (type) {
          case "strong":
            return <strong key={index}>{content}</strong>;

          case "italic":
            return <em key={index}>{content}</em>;

          case "underline":
            return <u key={index}>{content}</u>;

          case "strike":
            return <s key={index}>{content}</s>;

          case "code":
          case "inline_code":
            return (
              <code
                key={index}
                className="rounded bg-[var(--foreground)] px-1.5 py-0.5 font-mono text-[0.9em]"
              >
                {content}
              </code>
            );

          case "link": {
            const href = safeUrl(rawNode.href);
            if (!href) return <React.Fragment key={index}>{content}</React.Fragment>;

            const target =
              rawNode.target === "_blank" ? "_blank" : undefined;

            return (
              <a
                key={index}
                href={href}
                target={target}
                rel={target === "_blank" ? "noopener noreferrer" : undefined}
                title={asString(rawNode.title) || undefined}
                className="text-[var(--primary)] underline underline-offset-4 hover:opacity-80"
              >
                {content}
              </a>
            );
          }

          case "emoji":
            return <span key={index}>{value}</span>;

          case "mention":
            return (
              <span key={index} className="font-semibold text-[var(--primary)]">
                {content}
              </span>
            );

          case "highlight":
          case "mark":
            return (
              <mark
                key={index}
                className="rounded bg-yellow-300/20 px-1 text-inherit"
              >
                {content}
              </mark>
            );

          case "subscript":
            return <sub key={index}>{content}</sub>;

          case "superscript":
            return <sup key={index}>{content}</sup>;

          case "keyboard":
            return (
              <kbd
                key={index}
                className="rounded border border-[var(--border-subtle)] bg-[var(--foreground)] px-1.5 py-0.5 font-mono text-xs"
              >
                {content}
              </kbd>
            );

          case "small":
            return (
              <small key={index} className="text-xs">
                {content}
              </small>
            );

          case "text":
          default:
            return <React.Fragment key={index}>{content}</React.Fragment>;
        }
      })}
    </>
  );
}

function ParagraphContent({ block }: { block: UnknownRecord }) {
  const content = block.content;

  if (typeof content === "string") {
    return <>{content}</>;
  }

  if (Array.isArray(content)) {
    return <RichTextNodes nodes={content} />;
  }

  // Backward compatibility with the old UI model.
  if (typeof block.text === "string") {
    return <>{block.text}</>;
  }

  return null;
}

function ImageBlock({ block }: { block: UnknownRecord }) {
  const media = isRecord(block.media) ? block.media : {};
  const src = safeUrl(
    getString(block, "url", "src", "image_url") ||
      getString(media, "url", "src")
  );

  const alt = getString(block, "alt", "alt_text") ||
    getString(media, "alt_text") ||
    "تصویر مقاله";

  const caption = getString(block, "caption");
  const objectFit = block.object_fit === "contain" ||
    block.object_fit === "cover" ||
    block.object_fit === "fill"
      ? block.object_fit
      : "cover";

  if (!src) {
    return (
      <div className="rounded-card border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs text-[var(--text-muted)]">
        تصویر با شناسهٔ رسانهٔ {String(block.media_id ?? "نامشخص")} ثبت شده است؛
        برای نمایش آن باید URL رسانه در پاسخ API موجود باشد.
      </div>
    );
  }

  const image = (
    <img
      src={src}
      alt={alt}
      loading={block.lazy === false ? "eager" : "lazy"}
      decoding="async"
      className="max-h-[680px] w-full rounded-card"
      style={{ objectFit }}
    />
  );

  const link = safeUrl(block.link);

  return (
    <figure className="flex flex-col gap-2">
      {link ? (
        <a
          href={link}
          target={block.target === "_blank" ? "_blank" : undefined}
          rel={block.target === "_blank" ? "noopener noreferrer" : undefined}
        >
          {image}
        </a>
      ) : (
        image
      )}

      {caption && (
        <figcaption className="text-center text-xs leading-6 text-[var(--text-muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function GalleryBlock({ block }: { block: UnknownRecord }) {
  const images = asArray(block.images);
  const mediaItems = asArray(block.media);
  const mediaIds = asArray(block.media_ids);

  const items = images.length > 0 ? images : mediaItems;

  if (items.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs text-[var(--text-muted)]">
        گالری شامل {mediaIds.length} رسانه است؛ برای نمایش تصاویر باید URL
        رسانه‌ها از API دریافت شود.
      </div>
    );
  }

  const layout = block.layout === "slider" ? "slider" : "grid";

  return (
    <div
      className={
        layout === "slider"
          ? "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
          : "grid grid-cols-2 gap-3 md:grid-cols-3"
      }
    >
      {items.map((item, index) => {
        const media = isRecord(item) ? item : {};
        const src = safeUrl(
          typeof item === "string"
            ? item
            : getString(media, "url", "src", "image_url")
        );

        if (!src) return null;

        return (
          <img
            key={String(media.id ?? index)}
            src={src}
            alt={getString(media, "alt", "alt_text") || `تصویر ${index + 1}`}
            loading="lazy"
            decoding="async"
            className={
              layout === "slider"
                ? "h-64 w-[80%] shrink-0 snap-start rounded-card object-cover sm:w-[60%]"
                : "aspect-[4/3] w-full rounded-card object-cover"
            }
          />
        );
      })}
    </div>
  );
}

function VideoBlock({ block }: { block: UnknownRecord }) {
  const media = isRecord(block.media) ? block.media : {};
  const provider = asString(block.provider);
  const external = externalUrl(block.external_url);
  const localSrc = safeUrl(
    getString(block, "url", "src", "video_url") ||
      getString(media, "url", "src")
  );

  if (provider === "youtube" || provider === "vimeo" || external) {
    if (!external) {
      return (
        <p className="text-xs text-[var(--text-muted)]">
          نشانی ویدئو معتبر نیست.
        </p>
      );
    }

    return (
      <div className="aspect-video overflow-hidden rounded-card bg-black">
        <iframe
          src={external}
          title="ویدئوی مقاله"
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (!localSrc) {
    return (
      <div className="rounded-card border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs text-[var(--text-muted)]">
        ویدئو با شناسهٔ رسانهٔ {String(block.media_id ?? "نامشخص")} ثبت شده،
        اما نشانی فایل ویدئو در دادهٔ دریافتی وجود ندارد.
      </div>
    );
  }

  return (
    <video
      src={localSrc}
      controls={block.controls !== false}
      autoPlay={block.autoplay === true}
      playsInline
      className="w-full rounded-card bg-black"
    />
  );
}

function TableBlock({ block }: { block: UnknownRecord }) {
  const headers = asArray(block.headers).map((item) => asString(item));
  const rows = asArray(block.rows).map((row) =>
    asArray(row).map((cell) => asString(cell))
  );

  if (headers.length === 0 && rows.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto rounded-card border border-[var(--border-subtle)]">
      <table className="w-full min-w-[420px] border-collapse text-start text-sm">
        {headers.length > 0 && (
          <thead className="bg-[var(--foreground)]">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  scope="col"
                  className="border-b border-[var(--border-subtle)] px-4 py-3 font-bold"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="even:bg-[var(--foreground)]/40">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border-b border-[var(--border-subtle)] px-4 py-3 leading-7"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ block }: { block: UnknownRecord }) {
  const code = asString(block.code);
  if (!code) return null;

  return (
    <div className="overflow-hidden rounded-card border border-[var(--border-subtle)] bg-[#111827] text-slate-100">
      {block.language && (
        <div className="border-b border-white/10 px-4 py-2 text-xs text-slate-300">
          {asString(block.language)}
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-left text-xs leading-7" dir="ltr">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EmbedBlock({ block }: { block: UnknownRecord }) {
  const url = externalUrl(block.url);
  if (!url) {
    return (
      <p className="text-xs text-[var(--text-muted)]">
        نشانی محتوای تعبیه‌شده معتبر نیست.
      </p>
    );
  }

  const width = getNumber(block, "width", 800);
  const height = getNumber(block, "height", 450);

  return (
    <div className="w-full overflow-hidden rounded-card border border-[var(--border-subtle)]">
      <iframe
        src={url}
        title="محتوای تعبیه‌شده"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        referrerPolicy="strict-origin-when-cross-origin"
        className="w-full"
        style={{
          height: `min(${Math.max(180, Math.min(height, 1200))}px, 75vh)`,
          maxWidth: Math.max(280, Math.min(width, 1600)),
        }}
        allowFullScreen
      />
    </div>
  );
}

function AccordionBlock({ block }: { block: UnknownRecord }) {
  const items = asArray(block.items).filter(isRecord);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <details
          key={String(item.id ?? index)}
          className="rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/30 p-4"
        >
          <summary className="cursor-pointer font-semibold leading-7">
            {asString(item.title, "بدون عنوان")}
          </summary>
          <div className="pt-3 text-sm leading-8 text-[var(--text-muted)]">
            {asString(item.content)}
          </div>
        </details>
      ))}
    </div>
  );
}

function FaqBlock({ block }: { block: UnknownRecord }) {
  const questions = asArray(block.questions).filter(isRecord);
  if (questions.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-bold">سؤالات متداول</h3>
      {questions.map((item, index) => (
        <div
          key={String(item.id ?? index)}
          className="rounded-card border border-[var(--border-subtle)] p-4"
        >
          <h4 className="font-semibold leading-7">
            {asString(item.q, "سؤال")}
          </h4>
          <p className="mt-2 text-sm leading-8 text-[var(--text-muted)]">
            {asString(item.a)}
          </p>
        </div>
      ))}
    </section>
  );
}

function LocationBlock({ block }: { block: UnknownRecord }) {
  const address = isRecord(block.address) ? block.address : {};
  const coordinates = isRecord(block.coordinates) ? block.coordinates : {};
  const contact = isRecord(block.contact) ? block.contact : {};
  const map = isRecord(block.map) ? block.map : {};

  const latitude = coordinates.latitude;
  const longitude = coordinates.longitude;

  const hasCoordinates =
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude);

  const mapUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : null;

  const addressText = [
    address.country,
    address.province,
    address.city,
    address.street,
  ]
    .filter((item) => typeof item === "string" && item.trim())
    .join("، ");

  const hours = asArray(block.opening_hours).filter(isRecord);

  return (
    <section className="flex flex-col gap-3 rounded-card border border-[var(--border-subtle)] p-4">
      <h3 className="text-base font-bold">
        {asString(block.title, "موقعیت مکانی")}
      </h3>

      {block.description && (
        <p className="text-sm leading-7 text-[var(--text-muted)]">
          {asString(block.description)}
        </p>
      )}

      {addressText && (
        <p className="text-sm leading-7">{addressText}</p>
      )}

      {contact.phone && (
        <p className="text-sm" dir="ltr">
          تلفن: {asString(contact.phone)}
        </p>
      )}

      {contact.email && (
        <p className="text-sm" dir="ltr">
          ایمیل: {asString(contact.email)}
        </p>
      )}

      {hours.length > 0 && (
        <div className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
          <span className="font-semibold">ساعات کاری</span>
          {hours.map((item, index) => (
            <span key={index}>
              {asString(item.day)}: {asString(item.open)} تا{" "}
              {asString(item.close)}
            </span>
          ))}
        </div>
      )}

      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-sm font-semibold text-[var(--primary)] underline underline-offset-4"
        >
          مشاهده روی نقشه
        </a>
      )}

      {map.embed_url && externalUrl(map.embed_url) && (
        <iframe
          src={externalUrl(map.embed_url) ?? undefined}
          title="نقشه موقعیت"
          loading="lazy"
          className="h-64 w-full rounded-card border-0"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </section>
  );
}

function TimelineBlock({ block }: { block: UnknownRecord }) {
  const events = asArray(block.events).filter(isRecord);
  if (events.length === 0) return null;

  const horizontal = block.orientation === "horizontal";

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-base font-bold">
        {asString(block.title, "خط زمانی")}
      </h3>

      <div
        className={
          horizontal
            ? "flex snap-x gap-4 overflow-x-auto pb-3"
            : "relative flex flex-col gap-5 border-s-2 border-[var(--border-subtle)] ps-5"
        }
      >
        {events.map((event, index) => {
          const date = isRecord(event.date) ? event.date : {};
          const media = isRecord(event.media) ? event.media : {};
          const imageSrc = safeUrl(
            getString(event, "image_url", "url") ||
              getString(media, "url")
          );

          return (
            <article
              key={String(event.id ?? index)}
              className={
                horizontal
                  ? "w-[min(82vw,320px)] shrink-0 snap-start rounded-card border border-[var(--border-subtle)] p-4"
                  : "relative flex flex-col gap-2"
              }
            >
              {!horizontal && (
                <span className="absolute -start-[27px] top-2 h-3 w-3 rounded-full border-2 border-[var(--primary)] bg-[var(--bg-body)]" />
              )}

              <span className="text-xs font-semibold text-[var(--primary)]">
                {asString(date.value)}
              </span>

              <h4 className="font-bold leading-7">
                {asString(event.title)}
              </h4>

              {event.description && (
                <p className="text-sm leading-8 text-[var(--text-muted)]">
                  {asString(event.description)}
                </p>
              )}

              {imageSrc && (
                <img
                  src={imageSrc}
                  alt={asString(event.title, "تصویر رویداد")}
                  loading="lazy"
                  className="mt-2 max-h-52 w-full rounded-card object-cover"
                />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BlockRenderer({ block }: { block: UnknownRecord }) {
  switch (block.type) {
    case "heading": {
      const text = getString(block, "text");
      if (!text) return null;

      const level = Math.max(1, Math.min(6, getNumber(block, "level", 2)));
      const className =
        "pt-3 font-bold leading-8 text-[var(--text-white)] " +
        (level === 1
          ? "text-2xl"
          : level === 2
            ? "text-xl"
            : level === 3
              ? "text-lg"
              : "text-base");

      const commonProps = {
        id: getString(block, "anchor_id") || undefined,
        className,
      };

      switch (level) {
        case 1:
          return <h1 {...commonProps}>{text}</h1>;
        case 2:
          return <h2 {...commonProps}>{text}</h2>;
        case 3:
          return <h3 {...commonProps}>{text}</h3>;
        case 4:
          return <h4 {...commonProps}>{text}</h4>;
        case 5:
          return <h5 {...commonProps}>{text}</h5>;
        default:
          return <h6 {...commonProps}>{text}</h6>;
      }
    }

    case "paragraph":
      return (
        <p className="whitespace-pre-wrap text-sm leading-8 text-[var(--text-white)]/90">
          <ParagraphContent block={block} />
        </p>
      );

    case "quote":
      return (
        <blockquote className="flex flex-col gap-2 border-s-2 border-[var(--primary)] py-1 ps-4 text-sm leading-8 text-[var(--text-muted)]">
          <p>{asString(block.text)}</p>
          {block.citation && (
            <cite className="text-xs not-italic">
              {asString(block.citation)}
            </cite>
          )}
        </blockquote>
      );

    // Backward compatibility for old UI content.
    case "list": {
      const items = asArray(block.items).filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      );

      return items.length > 0 ? (
        <ul className="flex list-disc flex-col gap-2 ps-5 text-sm leading-7 marker:text-[var(--primary)]">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : null;
    }

    case "image":
      return <ImageBlock block={block} />;

    case "gallery":
      return <GalleryBlock block={block} />;

    case "table":
      return <TableBlock block={block} />;

    case "code":
      return <CodeBlock block={block} />;

    case "divider": {
      const style = block.style;
      const borderStyle =
        style === "dashed" || style === "dots" ? style : "solid";

      return (
        <hr
          className="my-3 border-0 border-t border-[var(--border-subtle)]"
          style={{
            borderTopStyle: borderStyle === "dots" ? "dotted" : borderStyle,
          }}
        />
      );
    }

    case "video":
      return <VideoBlock block={block} />;

    case "embed":
      return <EmbedBlock block={block} />;

    case "button": {
      const href = safeUrl(block.url);
      if (!href) return null;

      return (
        <div className="py-2">
          <a
            href={href}
            target={block.target === "_blank" ? "_blank" : undefined}
            rel={block.target === "_blank" ? "noopener noreferrer" : undefined}
            className="inline-flex min-h-11 items-center justify-center rounded-card bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-85"
          >
            {asString(block.label, "مشاهده")}
          </a>
        </div>
      );
    }

    case "accordion":
      return <AccordionBlock block={block} />;

    case "faq":
      return <FaqBlock block={block} />;

    case "location":
      return <LocationBlock block={block} />;

    case "timeline":
      return <TimelineBlock block={block} />;

    case "related_articles": {
      const ids = asArray(block.article_ids).filter(
        (id) =>
          (typeof id === "number" && Number.isFinite(id)) ||
          (typeof id === "string" && id.trim().length > 0)
      );

      if (ids.length === 0) return null;

      return (
        <aside className="rounded-card border border-[var(--border-subtle)] p-4">
          <h3 className="mb-2 font-bold">مقاله‌های مرتبط</h3>
          <p className="text-xs leading-6 text-[var(--text-muted)]">
            شناسهٔ مقاله‌های مرتبط: {ids.map(String).join("، ")}
          </p>
        </aside>
      );
    }

    default:
      // Unknown block types are intentionally not rendered.
      // The mapper should preserve their raw data for future support.
      return null;
  }
}

export const BlogArticleContent: React.FC<BlogArticleContentProps> = ({
  blocks,
}) => {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      {blocks.map((rawBlock, index) => {
        if (!isRecord(rawBlock)) return null;

        const key =
          typeof rawBlock.id === "string" && rawBlock.id.trim()
            ? rawBlock.id
            : `${String(rawBlock.type ?? "block")}-${index}`;

        return <BlockRenderer key={key} block={rawBlock} />;
      })}
    </div>
  );
};
