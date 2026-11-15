"use client";

import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type {
  BlogBlockSettings,
  BlogContentBlock,
  BlogRichTextNode,
} from "@/types/blog";
import { adminService } from "@/services/adminService";

interface BlockEditorFieldsProps {
  block: BlogContentBlock;
  onChange: (updated: BlogContentBlock) => void;
}

const RICH_TEXT_NODE_TYPES = [
  { value: "text", label: "متن ساده (text)" },
  { value: "strong", label: "ضخیم (strong)" },
  { value: "italic", label: "مورب (italic)" },
  { value: "underline", label: "زیرخط (underline)" },
  { value: "strike", label: "خط‌خورده (strike)" },
  { value: "link", label: "لینک (link)" },
  { value: "inline_code", label: "کد خطی (inline_code)" },
  { value: "highlight", label: "هایلایت (highlight)" },
  { value: "mark", label: "نشانه‌گذاری (mark)" },
  { value: "subscript", label: "زیرنویس (subscript)" },
  { value: "superscript", label: "بالانویس (superscript)" },
  { value: "keyboard", label: "کلید (keyboard)" },
  { value: "small", label: "کوچک (small)" },
  { value: "emoji", label: "ایموجی (emoji)" },
  { value: "mention", label: "منشن (mention)" },
  { value: "code", label: "کد (code)" },
];

const OPENING_DAYS = [
  { value: "saturday", label: "شنبه" },
  { value: "sunday", label: "یکشنبه" },
  { value: "monday", label: "دوشنبه" },
  { value: "tuesday", label: "سه‌شنبه" },
  { value: "wednesday", label: "چهارشنبه" },
  { value: "thursday", label: "پنج‌شنبه" },
  { value: "friday", label: "جمعه" },
];

const MAP_PROVIDERS = [
  { value: "google", label: "Google Maps" },
  { value: "neshan", label: "نشان (Neshan)" },
  { value: "balad", label: "بلد (Balad)" },
  { value: "openstreetmap", label: "OpenStreetMap" },
  { value: "leaflet", label: "Leaflet" },
  { value: "mapbox", label: "Mapbox" },
];

function BlockMediaUploader({
  label,
  mediaId,
  accept = "image/*",
  onUploaded,
}: {
  label: string;
  mediaId?: number | null;
  accept?: string;
  onUploaded: (id: number, url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const media = await adminService.uploadMedia({
        file,
        title: file.name,
        alt_text: file.name,
      });
      if (media.id != null) {
        onUploaded(Number(media.id), media.url || "");
        if (media.url) setPreviewUrl(media.url);
      } else {
        setUploadError("شناسه رسانه از سرور دریافت نشد.");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "خطا در آپلود رسانه.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFile}
          className="hidden"
          disabled={uploading}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Icon name="upload" size={14} />
          <span>{uploading ? "در حال آپلود..." : label}</span>
        </Button>
        {mediaId != null && mediaId > 0 && (
          <span className="text-[11px] font-semibold text-[var(--accent-green)]">
            Media ID: {mediaId}
          </span>
        )}
      </div>
      {uploadError && (
        <p className="text-xs text-[var(--accent-red)]">{uploadError}</p>
      )}
      {previewUrl && accept.startsWith("image") && (
        <img
          src={previewUrl}
          alt="پیش‌نمایش رسانه"
          className="h-24 w-36 rounded-card border border-[var(--border-subtle)] object-cover"
        />
      )}
    </div>
  );
}

const selectCls =
  "w-full h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]";
const textareaCls =
  "w-full p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] resize-y leading-6";
const labelCls = "block text-[11px] font-bold text-[var(--text-muted)] mb-1";

export const BlockSettingsEditor: React.FC<{
  settings?: BlogBlockSettings;
  onChange: (settings: BlogBlockSettings) => void;
}> = ({ settings = {}, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-[var(--border-subtle)] pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] text-[var(--text-muted)] hover:text-[var(--primary)]"
      >
        {open ? "▲ بستن تنظیمات ظاهری بلوک" : "▼ تنظیمات ظاهری بلوک (Settings)"}
      </button>

      {open && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <label className={labelCls}>چیدمان (Align)</label>
            <select
              value={settings.align || ""}
              onChange={(e) =>
                onChange({
                  ...settings,
                  align: (e.target.value || undefined) as BlogBlockSettings["align"],
                })
              }
              className={selectCls}
            >
              <option value="" className="bg-[var(--bg-card)]">پیش‌فرض</option>
              <option value="right" className="bg-[var(--bg-card)]">راست</option>
              <option value="center" className="bg-[var(--bg-card)]">وسط</option>
              <option value="left" className="bg-[var(--bg-card)]">چپ</option>
              <option value="justify" className="bg-[var(--bg-card)]">تراز (Justify)</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>فاصله (Spacing)</label>
            <select
              value={settings.spacing || ""}
              onChange={(e) =>
                onChange({
                  ...settings,
                  spacing: (e.target.value || undefined) as BlogBlockSettings["spacing"],
                })
              }
              className={selectCls}
            >
              <option value="" className="bg-[var(--bg-card)]">پیش‌فرض</option>
              <option value="none" className="bg-[var(--bg-card)]">بدون فاصله</option>
              <option value="xs" className="bg-[var(--bg-card)]">خیلی کم (xs)</option>
              <option value="sm" className="bg-[var(--bg-card)]">کم (sm)</option>
              <option value="md" className="bg-[var(--bg-card)]">متوسط (md)</option>
              <option value="lg" className="bg-[var(--bg-card)]">زیاد (lg)</option>
              <option value="xl" className="bg-[var(--bg-card)]">خیلی زیاد (xl)</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>عرض (Width)</label>
            <select
              value={settings.width || ""}
              onChange={(e) =>
                onChange({
                  ...settings,
                  width: (e.target.value || undefined) as BlogBlockSettings["width"],
                })
              }
              className={selectCls}
            >
              <option value="" className="bg-[var(--bg-card)]">پیش‌فرض</option>
              <option value="contained" className="bg-[var(--bg-card)]">محدود (Contained)</option>
              <option value="narrow" className="bg-[var(--bg-card)]">باریک (Narrow)</option>
              <option value="full_width" className="bg-[var(--bg-card)]">تمام‌عرض</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>نمایش (Visibility)</label>
            <select
              value={settings.visibility || "visible"}
              onChange={(e) =>
                onChange({
                  ...settings,
                  visibility: e.target.value as BlogBlockSettings["visibility"],
                })
              }
              className={selectCls}
            >
              <option value="visible" className="bg-[var(--bg-card)]">قابل نمایش</option>
              <option value="hidden" className="bg-[var(--bg-card)]">مخفی</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export const BlockEditorFields: React.FC<BlockEditorFieldsProps> = ({
  block,
  onChange,
}) => {
  const [richMode, setRichMode] = useState<boolean>(() => {
    if (block.type !== "paragraph") return false;
    const nodes = Array.isArray(block.content) ? block.content : [];
    return nodes.length > 1 || nodes.some((n) => n.type !== "text");
  });

  switch (block.type) {
    case "heading":
      return (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>سطح عنوان (Level) *</label>
              <select
                value={block.level || 2}
                onChange={(e) =>
                  onChange({
                    ...block,
                    level: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6,
                  })
                }
                className={selectCls}
              >
                {[1, 2, 3, 4, 5, 6].map((lvl) => (
                  <option key={lvl} value={lvl} className="bg-[var(--bg-card)]">
                    H{lvl}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>شناسه لنگر (Anchor ID - اختیاری)</label>
              <Input
                value={block.anchor_id || ""}
                onChange={(e) =>
                  onChange({ ...block, anchor_id: e.target.value || undefined })
                }
                placeholder="مثلاً: introduction"
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>متن عنوان *</label>
            <Input
              value={block.text || ""}
              onChange={(e) => onChange({ ...block, text: e.target.value })}
              placeholder="متن تیتر را وارد کنید..."
            />
          </div>
        </div>
      );

    case "paragraph": {
      const nodes: BlogRichTextNode[] = Array.isArray(block.content) && block.content.length > 0
        ? block.content
        : [{ type: "text", value: block.text || "" }];
      const plainText =
        typeof block.text === "string" && !richMode
          ? block.text
          : nodes.map((n) => n.value || "").join("");

      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className={labelCls}>محتوای پاراگراف *</label>
            <button
              type="button"
              onClick={() => setRichMode((v) => !v)}
              className="text-[11px] text-[var(--primary)] hover:underline"
            >
              {richMode ? "حالت متن ساده" : "حالت Node پیشرفته (لینک، ضخیم و...)"}
            </button>
          </div>

          {!richMode ? (
            <textarea
              value={plainText}
              onChange={(e) => {
                const value = e.target.value;
                onChange({
                  ...block,
                  text: value,
                  content: [{ type: "text", value }],
                });
              }}
              rows={5}
              placeholder="متن پاراگراف را اینجا بنویسید..."
              className={textareaCls}
              dir="auto"
            />
          ) : (
            <div className="flex flex-col gap-2">
              {nodes.map((node, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/20 p-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={node.type || "text"}
                      onChange={(e) => {
                        const next = [...nodes];
                        next[idx] = { ...node, type: e.target.value };
                        onChange({
                          ...block,
                          content: next,
                          text: next.map((n) => n.value || "").join(""),
                        });
                      }}
                      className="h-9 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/40 px-2 text-xs text-[var(--text-white)]"
                    >
                      {RICH_TEXT_NODE_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[var(--bg-card)]">
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex-1 min-w-[180px]">
                      <Input
                        value={node.value || ""}
                        onChange={(e) => {
                          const next = [...nodes];
                          next[idx] = { ...node, value: e.target.value };
                          onChange({
                            ...block,
                            content: next,
                            text: next.map((n) => n.value || "").join(""),
                          });
                        }}
                        placeholder="متن..."
                      />
                    </div>

                    {nodes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = nodes.filter((_, i) => i !== idx);
                          onChange({
                            ...block,
                            content: next,
                            text: next.map((n) => n.value || "").join(""),
                          });
                        }}
                        className="p-1 text-[var(--accent-red)]"
                        title="حذف بخش"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    )}
                  </div>

                  {node.type === "link" && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        value={node.href || ""}
                        onChange={(e) => {
                          const next = [...nodes];
                          next[idx] = { ...node, href: e.target.value };
                          onChange({ ...block, content: next });
                        }}
                        placeholder="آدرس لینک (https://...)"
                        dir="ltr"
                      />
                      <Input
                        value={node.title || ""}
                        onChange={(e) => {
                          const next = [...nodes];
                          next[idx] = { ...node, title: e.target.value || undefined };
                          onChange({ ...block, content: next });
                        }}
                        placeholder="عنوان لینک (اختیاری)"
                      />
                    </div>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const next = [...nodes, { type: "text", value: "" }];
                  onChange({ ...block, content: next });
                }}
              >
                + افزودن بخش متنی (Node)
              </Button>
            </div>
          )}
        </div>
      );
    }

    case "image":
      return (
        <div className="flex flex-col gap-3">
          <BlockMediaUploader
            label="آپلود تصویر از سیستم"
            mediaId={block.media_id}
            onUploaded={(id) => onChange({ ...block, media_id: id })}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>شناسه رسانه (Media ID) *</label>
              <Input
                type="number"
                min={1}
                value={block.media_id || ""}
                onChange={(e) =>
                  onChange({ ...block, media_id: Number(e.target.value) || 0 })
                }
                placeholder="مثلاً 42"
              />
            </div>
            <div>
              <label className={labelCls}>نحوه نمایش (Object Fit)</label>
              <select
                value={block.object_fit || "cover"}
                onChange={(e) => onChange({ ...block, object_fit: e.target.value })}
                className={selectCls}
              >
                <option value="cover" className="bg-[var(--bg-card)]">cover</option>
                <option value="contain" className="bg-[var(--bg-card)]">contain</option>
                <option value="fill" className="bg-[var(--bg-card)]">fill</option>
                <option value="none" className="bg-[var(--bg-card)]">none</option>
                <option value="scale-down" className="bg-[var(--bg-card)]">scale-down</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>متن جایگزین (Alt)</label>
              <Input
                value={block.alt || ""}
                onChange={(e) => onChange({ ...block, alt: e.target.value })}
                placeholder="توضیح تصویر برای سئو"
              />
            </div>
            <div>
              <label className={labelCls}>زیرنویس (Caption)</label>
              <Input
                value={block.caption || ""}
                onChange={(e) => onChange({ ...block, caption: e.target.value })}
                placeholder="زیرنویس تصویر"
              />
            </div>
            <div>
              <label className={labelCls}>لینک تصویر (اختیاری)</label>
              <Input
                value={block.link || ""}
                onChange={(e) =>
                  onChange({ ...block, link: e.target.value || undefined })
                }
                placeholder="https://..."
                dir="ltr"
              />
            </div>
            <div className="flex items-center gap-4 pt-5">
              <label className="flex items-center gap-2 text-xs text-[var(--text-white)]">
                <input
                  type="checkbox"
                  checked={block.lazy !== false}
                  onChange={(e) => onChange({ ...block, lazy: e.target.checked })}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                بارگذاری تنبل (Lazy)
              </label>
            </div>
          </div>
        </div>
      );

    case "gallery": {
      const ids = Array.isArray(block.media_ids) ? block.media_ids : [];
      return (
        <div className="flex flex-col gap-3">
          <BlockMediaUploader
            label="افزودن تصویر به گالری"
            onUploaded={(id) =>
              onChange({ ...block, media_ids: [...ids, id] })
            }
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>چیدمان گالری</label>
              <select
                value={block.layout || "grid"}
                onChange={(e) =>
                  onChange({
                    ...block,
                    layout: e.target.value as "grid" | "slider",
                  })
                }
                className={selectCls}
              >
                <option value="grid" className="bg-[var(--bg-card)]">شبکه‌ای (Grid)</option>
                <option value="slider" className="bg-[var(--bg-card)]">اسلایدر (Slider)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>نسبت تصویر (Aspect Ratio)</label>
              <select
                value={block.aspect_ratio || "16:9"}
                onChange={(e) => onChange({ ...block, aspect_ratio: e.target.value })}
                className={selectCls}
              >
                <option value="16:9" className="bg-[var(--bg-card)]">16:9</option>
                <option value="4:3" className="bg-[var(--bg-card)]">4:3</option>
                <option value="1:1" className="bg-[var(--bg-card)]">1:1</option>
                <option value="3:4" className="bg-[var(--bg-card)]">3:4</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>شناسه‌های رسانه (جدا شده با کاما) *</label>
            <Input
              value={ids.join(", ")}
              onChange={(e) => {
                const parsed = e.target.value
                  .split(",")
                  .map((s) => Number(s.trim()))
                  .filter((n) => Number.isInteger(n) && n > 0);
                onChange({ ...block, media_ids: parsed });
              }}
              placeholder="مثلاً: 42, 43, 44"
              dir="ltr"
            />
          </div>
        </div>
      );
    }

    case "quote":
      return (
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelCls}>متن نقل‌قول *</label>
            <textarea
              value={block.text || ""}
              onChange={(e) => onChange({ ...block, text: e.target.value })}
              rows={3}
              placeholder="متن نقل‌قول..."
              className={textareaCls}
            />
          </div>
          <div>
            <label className={labelCls}>منبع / گوینده (Citation - اختیاری)</label>
            <Input
              value={block.citation || ""}
              onChange={(e) => onChange({ ...block, citation: e.target.value })}
              placeholder="نام نویسنده یا منبع"
            />
          </div>
        </div>
      );

    case "table": {
      const headers = Array.isArray(block.headers) ? block.headers : ["ستون ۱"];
      const rows = Array.isArray(block.rows) ? block.rows : [[""]];
      const colCount = headers.length;

      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                onChange({
                  ...block,
                  headers: [...headers, `ستون ${headers.length + 1}`],
                  rows: rows.map((r) => [...r, ""]),
                })
              }
            >
              + ستون جدید
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                onChange({
                  ...block,
                  rows: [...rows, Array.from({ length: colCount }, () => "")],
                })
              }
            >
              + سطر جدید
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {headers.map((h, colIdx) => (
                    <th key={colIdx} className="p-1">
                      <div className="flex items-center gap-1">
                        <Input
                          value={h}
                          onChange={(e) => {
                            const nextH = [...headers];
                            nextH[colIdx] = e.target.value;
                            onChange({ ...block, headers: nextH });
                          }}
                          placeholder={`عنوان ستون ${colIdx + 1}`}
                        />
                        {headers.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              onChange({
                                ...block,
                                headers: headers.filter((_, i) => i !== colIdx),
                                rows: rows.map((r) => r.filter((_, i) => i !== colIdx)),
                              })
                            }
                            className="text-[var(--accent-red)]"
                            title="حذف ستون"
                          >
                            <Icon name="close" size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {headers.map((_, colIdx) => (
                      <td key={colIdx} className="p-1">
                        <Input
                          value={row[colIdx] ?? ""}
                          onChange={(e) => {
                            const nextRows = rows.map((r, ri) =>
                              ri === rowIdx
                                ? headers.map((__, ci) =>
                                    ci === colIdx ? e.target.value : r[ci] ?? ""
                                  )
                                : r
                            );
                            onChange({ ...block, rows: nextRows });
                          }}
                          placeholder="مقدار..."
                        />
                      </td>
                    ))}
                    <td className="p-1">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            onChange({
                              ...block,
                              rows: rows.filter((_, i) => i !== rowIdx),
                            })
                          }
                          className="text-[var(--accent-red)]"
                          title="حذف سطر"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    case "code":
      return (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>زبان برنامه‌نویسی</label>
              <Input
                value={block.language || ""}
                onChange={(e) => onChange({ ...block, language: e.target.value })}
                placeholder="javascript, python, typescript, ..."
                dir="ltr"
              />
            </div>
            <label className="flex items-center gap-2 pt-5 text-xs text-[var(--text-white)]">
              <input
                type="checkbox"
                checked={block.show_line_numbers !== false}
                onChange={(e) =>
                  onChange({ ...block, show_line_numbers: e.target.checked })
                }
                className="h-4 w-4 accent-[var(--primary)]"
              />
              نمایش شماره خطوط
            </label>
          </div>
          <div>
            <label className={labelCls}>قطعه کد *</label>
            <textarea
              value={block.code || ""}
              onChange={(e) => onChange({ ...block, code: e.target.value })}
              rows={6}
              placeholder="console.log('Hello World');"
              className={`${textareaCls} font-mono`}
              dir="ltr"
            />
          </div>
        </div>
      );

    case "divider":
      return (
        <div>
          <label className={labelCls}>نوع خط جداکننده</label>
          <select
            value={block.style || "solid"}
            onChange={(e) =>
              onChange({
                ...block,
                style: e.target.value as "solid" | "dashed" | "dots",
              })
            }
            className={selectCls}
          >
            <option value="solid" className="bg-[var(--bg-card)]">خط ممتد (solid)</option>
            <option value="dashed" className="bg-[var(--bg-card)]">خط‌چین (dashed)</option>
            <option value="dots" className="bg-[var(--bg-card)]">نقطه‌چین (dots)</option>
          </select>
        </div>
      );

    case "video":
      return (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>منبع ویدئو (Provider)</label>
              <select
                value={block.provider || "youtube"}
                onChange={(e) =>
                  onChange({
                    ...block,
                    provider: e.target.value as "local" | "youtube" | "vimeo",
                  })
                }
                className={selectCls}
              >
                <option value="youtube" className="bg-[var(--bg-card)]">YouTube</option>
                <option value="vimeo" className="bg-[var(--bg-card)]">Vimeo</option>
                <option value="local" className="bg-[var(--bg-card)]">فایل محلی (Media Library)</option>
              </select>
            </div>
            <div className="flex items-center gap-4 pt-5">
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-white)]">
                <input
                  type="checkbox"
                  checked={block.controls !== false}
                  onChange={(e) =>
                    onChange({ ...block, controls: e.target.checked })
                  }
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                کنترل‌پخش
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-white)]">
                <input
                  type="checkbox"
                  checked={block.autoplay === true}
                  onChange={(e) =>
                    onChange({ ...block, autoplay: e.target.checked })
                  }
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                پخش خودکار
              </label>
            </div>
          </div>

          {block.provider === "local" ? (
            <div className="flex flex-col gap-2">
              <BlockMediaUploader
                label="آپلود فایل ویدئو"
                mediaId={block.media_id}
                accept="video/*"
                onUploaded={(id) => onChange({ ...block, media_id: id })}
              />
              <div>
                <label className={labelCls}>شناسه رسانه ویدئو (Media ID) *</label>
                <Input
                  type="number"
                  min={1}
                  value={block.media_id || ""}
                  onChange={(e) =>
                    onChange({
                      ...block,
                      media_id: Number(e.target.value) || undefined,
                    })
                  }
                  placeholder="مثلاً 45"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className={labelCls}>لینک ویدئو (YouTube / Vimeo URL) *</label>
              <Input
                value={block.external_url || ""}
                onChange={(e) =>
                  onChange({ ...block, external_url: e.target.value })
                }
                placeholder="https://www.youtube.com/watch?v=..."
                dir="ltr"
              />
            </div>
          )}
        </div>
      );

    case "embed":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>نوع Embed</label>
            <select
              value={block.embed_type || "iframe"}
              onChange={(e) =>
                onChange({
                  ...block,
                  embed_type: e.target.value as "twitter" | "instagram" | "iframe",
                })
              }
              className={selectCls}
            >
              <option value="iframe" className="bg-[var(--bg-card)]">iframe</option>
              <option value="twitter" className="bg-[var(--bg-card)]">Twitter / X</option>
              <option value="instagram" className="bg-[var(--bg-card)]">Instagram</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>عرض (px)</label>
            <Input
              type="number"
              min={200}
              value={block.width ?? 600}
              onChange={(e) =>
                onChange({ ...block, width: Number(e.target.value) || 600 })
              }
            />
          </div>
          <div>
            <label className={labelCls}>ارتفاع (px)</label>
            <Input
              type="number"
              min={150}
              value={block.height ?? 400}
              onChange={(e) =>
                onChange({ ...block, height: Number(e.target.value) || 400 })
              }
            />
          </div>
          <div className="sm:col-span-3">
            <label className={labelCls}>آدرس (URL) *</label>
            <Input
              value={block.url || ""}
              onChange={(e) => onChange({ ...block, url: e.target.value })}
              placeholder="https://..."
              dir="ltr"
            />
          </div>
        </div>
      );

    case "button":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>متن دکمه (Label) *</label>
            <Input
              value={block.label || ""}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
              placeholder="مثلاً: مشاهده و دانلود"
            />
          </div>
          <div>
            <label className={labelCls}>لینک مقصد (URL) *</label>
            <Input
              value={block.url || ""}
              onChange={(e) => onChange({ ...block, url: e.target.value })}
              placeholder="https://..."
              dir="ltr"
            />
          </div>
          <div>
            <label className={labelCls}>نحوه باز شدن</label>
            <select
              value={block.target || "_blank"}
              onChange={(e) =>
                onChange({
                  ...block,
                  target: e.target.value as "_blank" | "_self",
                })
              }
              className={selectCls}
            >
              <option value="_blank" className="bg-[var(--bg-card)]">تب جدید (_blank)</option>
              <option value="_self" className="bg-[var(--bg-card)]">همان صفحه (_self)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>استایل دکمه</label>
            <Input
              value={block.style_preset || "primary"}
              onChange={(e) =>
                onChange({ ...block, style_preset: e.target.value })
              }
              placeholder="primary"
              dir="ltr"
            />
          </div>
        </div>
      );

    case "accordion": {
      const items = Array.isArray(block.items) ? block.items : [];
      return (
        <div className="flex flex-col gap-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/20 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[var(--text-muted)]">
                  پنل {idx + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...block,
                        items: items.filter((_, i) => i !== idx),
                      })
                    }
                    className="text-[var(--accent-red)]"
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
              <Input
                value={item.title || ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...item, title: e.target.value };
                  onChange({ ...block, items: next });
                }}
                placeholder="عنوان پنل *"
              />
              <textarea
                value={item.content || ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...item, content: e.target.value };
                  onChange({ ...block, items: next });
                }}
                rows={2}
                placeholder="محتوای پنل"
                className={textareaCls}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                items: [...items, { title: "", content: "" }],
              })
            }
          >
            + افزودن پنل آکاردئون
          </Button>
        </div>
      );
    }

    case "faq": {
      const questions = Array.isArray(block.questions) ? block.questions : [];
      return (
        <div className="flex flex-col gap-3">
          {questions.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/20 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[var(--text-muted)]">
                  پرسش {idx + 1}
                </span>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...block,
                        questions: questions.filter((_, i) => i !== idx),
                      })
                    }
                    className="text-[var(--accent-red)]"
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
              <Input
                value={item.q || ""}
                onChange={(e) => {
                  const next = [...questions];
                  next[idx] = { ...item, q: e.target.value };
                  onChange({ ...block, questions: next });
                }}
                placeholder="سؤال *"
              />
              <textarea
                value={item.a || ""}
                onChange={(e) => {
                  const next = [...questions];
                  next[idx] = { ...item, a: e.target.value };
                  onChange({ ...block, questions: next });
                }}
                rows={2}
                placeholder="پاسخ *"
                className={textareaCls}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                questions: [...questions, { q: "", a: "" }],
              })
            }
          >
            + افزودن پرسش جدید
          </Button>
        </div>
      );
    }

    case "location": {
      const address = block.address || {
        country: "",
        province: "",
        city: "",
        street: "",
      };
      const coords = block.coordinates || { latitude: 35.6892, longitude: 51.389 };
      const contact = block.contact || {};
      const hours = Array.isArray(block.opening_hours) ? block.opening_hours : [];
      const mapCfg = block.map || { provider: "google", zoom: 15 };

      const updateCoords = (lat: number, lng: number) => {
        onChange({
          ...block,
          coordinates: { latitude: lat, longitude: lng },
          geo: { type: "Point", coordinates: [lng, lat] },
        });
      };

      return (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>عنوان مکان *</label>
              <Input
                value={block.title || ""}
                onChange={(e) => onChange({ ...block, title: e.target.value })}
                placeholder="مثلاً: خانه تاریخی علوی"
              />
            </div>
            <div>
              <label className={labelCls}>توضیح کوتاه (اختیاری)</label>
              <Input
                value={block.description || ""}
                onChange={(e) => onChange({ ...block, description: e.target.value })}
                placeholder="توضیحات مکان"
              />
            </div>
            <div>
              <label className={labelCls}>کشور *</label>
              <Input
                value={address.country || ""}
                onChange={(e) =>
                  onChange({ ...block, address: { ...address, country: e.target.value } })
                }
                placeholder="Iran"
              />
            </div>
            <div>
              <label className={labelCls}>استان *</label>
              <Input
                value={address.province || ""}
                onChange={(e) =>
                  onChange({ ...block, address: { ...address, province: e.target.value } })
                }
                placeholder="تهران"
              />
            </div>
            <div>
              <label className={labelCls}>شهر *</label>
              <Input
                value={address.city || ""}
                onChange={(e) =>
                  onChange({ ...block, address: { ...address, city: e.target.value } })
                }
                placeholder="تهران"
              />
            </div>
            <div>
              <label className={labelCls}>خیابان / نشانی دقیق *</label>
              <Input
                value={address.street || ""}
                onChange={(e) =>
                  onChange({ ...block, address: { ...address, street: e.target.value } })
                }
                placeholder="خیابان ولیعصر..."
              />
            </div>
            <div>
              <label className={labelCls}>عرض جغرافیایی (Latitude) *</label>
              <Input
                type="number"
                step="any"
                value={coords.latitude}
                onChange={(e) =>
                  updateCoords(Number(e.target.value) || 0, coords.longitude)
                }
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>طول جغرافیایی (Longitude) *</label>
              <Input
                type="number"
                step="any"
                value={coords.longitude}
                onChange={(e) =>
                  updateCoords(coords.latitude, Number(e.target.value) || 0)
                }
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>سرویس نقشه</label>
              <select
                value={mapCfg.provider || "google"}
                onChange={(e) =>
                  onChange({
                    ...block,
                    map: { ...mapCfg, provider: e.target.value },
                  })
                }
                className={selectCls}
              >
                {MAP_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value} className="bg-[var(--bg-card)]">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>بزرگ‌نمایی نقشه (Zoom 1-20)</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={mapCfg.zoom ?? 15}
                onChange={(e) =>
                  onChange({
                    ...block,
                    map: {
                      ...mapCfg,
                      zoom: Math.min(20, Math.max(1, Number(e.target.value) || 15)),
                    },
                  })
                }
              />
            </div>
            <div>
              <label className={labelCls}>تلفن</label>
              <Input
                value={String(contact.phone || "")}
                onChange={(e) =>
                  onChange({
                    ...block,
                    contact: { ...contact, phone: e.target.value || null },
                  })
                }
                placeholder="021..."
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>وب‌سایت</label>
              <Input
                value={String(contact.website || "")}
                onChange={(e) =>
                  onChange({
                    ...block,
                    contact: { ...contact, website: e.target.value || null },
                  })
                }
                placeholder="https://..."
                dir="ltr"
              />
            </div>
          </div>

          <BlockMediaUploader
            label="تصویر مکان (اختیاری)"
            mediaId={block.media_id}
            onUploaded={(id) => onChange({ ...block, media_id: id })}
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className={labelCls}>ساعات کاری</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  onChange({
                    ...block,
                    opening_hours: [
                      ...hours,
                      { day: "saturday", open: "09:00", close: "17:00" },
                    ],
                  })
                }
              >
                + افزودن ساعت کاری
              </Button>
            </div>
            {hours.map((h, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <select
                  value={h.day}
                  onChange={(e) => {
                    const next = [...hours];
                    next[idx] = { ...h, day: e.target.value };
                    onChange({ ...block, opening_hours: next });
                  }}
                  className="h-9 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/40 px-2 text-xs text-[var(--text-white)]"
                >
                  {OPENING_DAYS.map((d) => (
                    <option key={d.value} value={d.value} className="bg-[var(--bg-card)]">
                      {d.label}
                    </option>
                  ))}
                </select>
                <Input
                  value={h.open}
                  onChange={(e) => {
                    const next = [...hours];
                    next[idx] = { ...h, open: e.target.value };
                    onChange({ ...block, opening_hours: next });
                  }}
                  placeholder="09:00"
                  dir="ltr"
                  className="w-24"
                />
                <span className="text-xs text-[var(--text-muted)]">تا</span>
                <Input
                  value={h.close}
                  onChange={(e) => {
                    const next = [...hours];
                    next[idx] = { ...h, close: e.target.value };
                    onChange({ ...block, opening_hours: next });
                  }}
                  placeholder="17:00"
                  dir="ltr"
                  className="w-24"
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...block,
                      opening_hours: hours.filter((_, i) => i !== idx),
                    })
                  }
                  className="text-[var(--accent-red)]"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "timeline": {
      const events = Array.isArray(block.events) ? block.events : [];
      return (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>عنوان خط زمانی *</label>
              <Input
                value={block.title || ""}
                onChange={(e) => onChange({ ...block, title: e.target.value })}
                placeholder="مثلاً: تاریخچه پروژه"
              />
            </div>
            <div>
              <label className={labelCls}>جهت نمایش</label>
              <select
                value={block.orientation || "vertical"}
                onChange={(e) =>
                  onChange({
                    ...block,
                    orientation: e.target.value as "vertical" | "horizontal",
                  })
                }
                className={selectCls}
              >
                <option value="vertical" className="bg-[var(--bg-card)]">عمودی (Vertical)</option>
                <option value="horizontal" className="bg-[var(--bg-card)]">افقی (Horizontal)</option>
              </select>
            </div>
          </div>

          {events.map((ev, idx) => (
            <div
              key={ev.id || idx}
              className="flex flex-col gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/20 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--text-muted)]">
                  رویداد {idx + 1}
                </span>
                {events.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...block,
                        events: events.filter((_, i) => i !== idx),
                      })
                    }
                    className="text-[var(--accent-red)]"
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  value={ev.date?.type || "year"}
                  onChange={(e) => {
                    const next = [...events];
                    next[idx] = {
                      ...ev,
                      date: {
                        ...ev.date,
                        type: e.target.value as "year" | "date" | "range",
                      },
                    };
                    onChange({ ...block, events: next });
                  }}
                  className={selectCls}
                >
                  <option value="year" className="bg-[var(--bg-card)]">سال (year)</option>
                  <option value="date" className="bg-[var(--bg-card)]">تاریخ (date)</option>
                  <option value="range" className="bg-[var(--bg-card)]">بازه (range)</option>
                </select>
                <div className="sm:col-span-2">
                  <Input
                    value={ev.date?.value || ""}
                    onChange={(e) => {
                      const next = [...events];
                      next[idx] = {
                        ...ev,
                        date: { ...ev.date, value: e.target.value },
                      };
                      onChange({ ...block, events: next });
                    }}
                    placeholder="مقدار تاریخ (مثلاً ۱۴۰۲) *"
                  />
                </div>
              </div>

              <Input
                value={ev.title || ""}
                onChange={(e) => {
                  const next = [...events];
                  next[idx] = { ...ev, title: e.target.value };
                  onChange({ ...block, events: next });
                }}
                placeholder="عنوان رویداد *"
              />
              <textarea
                value={ev.description || ""}
                onChange={(e) => {
                  const next = [...events];
                  next[idx] = { ...ev, description: e.target.value };
                  onChange({ ...block, events: next });
                }}
                rows={2}
                placeholder="توضیحات رویداد *"
                className={textareaCls}
              />

              <BlockMediaUploader
                label="تصویر رویداد (اختیاری)"
                mediaId={ev.media_id}
                onUploaded={(id) => {
                  const next = [...events];
                  next[idx] = { ...ev, media_id: id };
                  onChange({ ...block, events: next });
                }}
              />
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                events: [
                  ...events,
                  {
                    id: `ev_${Date.now().toString(36)}_${events.length + 1}`,
                    date: { type: "year", value: "" },
                    title: "",
                    description: "",
                  },
                ],
              })
            }
          >
            + افزودن رویداد
          </Button>
        </div>
      );
    }

    case "related_articles": {
      const ids = Array.isArray(block.article_ids) ? block.article_ids : [];
      return (
        <div>
          <label className={labelCls}>
            شناسه‌های مقالات مرتبط (اعداد مثبت جداشده با کاما) *
          </label>
          <Input
            value={ids.join(", ")}
            onChange={(e) => {
              const parsed = e.target.value
                .split(",")
                .map((s) => Number(s.trim()))
                .filter((n) => Number.isInteger(n) && n > 0);
              onChange({ ...block, article_ids: parsed });
            }}
            placeholder="مثلاً: 101, 102, 103"
            dir="ltr"
          />
        </div>
      );
    }

    default:
      return null;
  }
};
