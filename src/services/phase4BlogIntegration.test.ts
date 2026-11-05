import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { adminService } from "./adminService";
import { blogApiService } from "./blogApiService";
import {
  mapBlocksToApi,
  mapBlocksToUi,
  mapAdminInputToCreateRequest,
  mapAdminInputToPatchRequest,
} from "@/lib/mappers/blogMapper";
import type {
  CategoryDto,
  TagDto,
  MediaDetailDto,
  AuthorProfileDto,
  BlockDefinitionDto,
  ArticleDetailDto,
} from "@/types/blogApi";
import type { BlogContentBlock, AdminBlogPostInput } from "@/types/blog";

describe("Phase 4: Blog Media, Categories, Tags, and Content Blocks Integration", () => {
  const originalGetCategories = blogApiService.getCategories;
  const originalCreateCategory = blogApiService.createCategory;
  const originalUpdateCategory = blogApiService.updateCategory;
  const originalDeleteCategory = blogApiService.deleteCategory;
  const originalGetTags = blogApiService.getTags;
  const originalCreateTag = blogApiService.createTag;
  const originalDeleteTag = blogApiService.deleteTag;
  const originalUploadMedia = blogApiService.uploadMedia;
  const originalGetAuthors = blogApiService.getAuthors;
  const originalGetBlockDefinitions = blogApiService.getBlockDefinitions;
  const originalCreateArticle = blogApiService.createArticle;

  afterEach(() => {
    blogApiService.getCategories = originalGetCategories;
    blogApiService.createCategory = originalCreateCategory;
    blogApiService.updateCategory = originalUpdateCategory;
    blogApiService.deleteCategory = originalDeleteCategory;
    blogApiService.getTags = originalGetTags;
    blogApiService.createTag = originalCreateTag;
    blogApiService.deleteTag = originalDeleteTag;
    blogApiService.uploadMedia = originalUploadMedia;
    blogApiService.getAuthors = originalGetAuthors;
    blogApiService.getBlockDefinitions = originalGetBlockDefinitions;
    blogApiService.createArticle = originalCreateArticle;
  });

  // 1. Categories Management & Selection
  describe("1. Categories Management", () => {
    it("fetches categories and maps to list", async () => {
      const mockCats: CategoryDto[] = [
        { id: 10, name: "کنسول و گیم", slug: "console", parent: null, description: "همه کنسول‌ها", icon: null },
        { id: 11, name: "سخت‌افزار", slug: "hardware", parent: null, description: "سخت‌افزار", icon: null },
      ];
      blogApiService.getCategories = mock(async () => mockCats);

      const res = await adminService.getCategoryList();
      expect(res).toHaveLength(2);
      expect(res[0].id).toBe(10);
      expect(res[0].name).toBe("کنسول و گیم");

      const uiCats = await adminService.getBlogCategories();
      expect(uiCats).toHaveLength(2);
      expect(uiCats[0]).toEqual({ id: "10", label: "کنسول و گیم" });
    });

    it("creates, updates, and deletes categories via real endpoints", async () => {
      const createdCat: CategoryDto = {
        id: 99,
        name: "دسته جدید",
        slug: "new-category",
        parent: null,
        description: "توضیح",
        icon: null,
      };
      blogApiService.createCategory = mock(async () => createdCat);
      blogApiService.updateCategory = mock(async () => ({ ...createdCat, name: "دسته ویرایش‌شده" }));
      blogApiService.deleteCategory = mock(async () => {});

      const created = await adminService.createCategory({ name: "دسته جدید", slug: "new-category" });
      expect(created.id).toBe(99);
      expect(created.name).toBe("دسته جدید");

      const updated = await adminService.updateCategory(99, { name: "دسته ویرایش‌شده", slug: "new-category" });
      expect(updated.name).toBe("دسته ویرایش‌شده");

      await expect(adminService.deleteCategory(99)).resolves.toBeUndefined();
    });

    it("converts selected string category into numeric category_id in article payload", async () => {
      let sentPayload: any = null;
      blogApiService.createArticle = mock(async (req) => {
        sentPayload = req;
        return {
          id: 50,
          slug: "test-slug",
          title: "Title",
          excerpt: "Excerpt",
          content: "Content",
          content_blocks: [],
        } as unknown as ArticleDetailDto;
      });

      const input: AdminBlogPostInput = {
        title: "مقاله جدید تست",
        slug: "test-slug",
        excerpt: "چکیده مقاله تست",
        category: "42",
        authorName: "نویسنده تست",
        readingMinutes: 3,
        coverUrl: "/img/gamnet-1.webp",
        tags: [],
        status: "DRAFT",
        content: [{ type: "paragraph", text: "متن نمونه" }],
      };

      await adminService.createBlogPost(input);
      expect(sentPayload).toBeDefined();
      expect(sentPayload.category_id).toBe(42);
    });
  });

  // 2. Tags Management & Deduplication
  describe("2. Tags Management", () => {
    it("fetches existing tags", async () => {
      const mockTags: TagDto[] = [
        { id: 1, name: "پلی‌استیشن", slug: "ps5" },
        { id: 2, name: "ایکس‌باکس", slug: "xbox" },
      ];
      blogApiService.getTags = mock(async () => mockTags);

      const tags = await adminService.getTagsList();
      expect(tags).toHaveLength(2);
      expect(tags[0].name).toBe("پلی‌استیشن");
    });

    it("creates a new tag and deletes a tag", async () => {
      blogApiService.createTag = mock(async (req) => ({ id: 5, name: req.name, slug: req.slug }));
      blogApiService.deleteTag = mock(async () => {});

      const created = await adminService.createTag({ name: "نینتندو", slug: "nintendo" });
      expect(created.id).toBe(5);
      expect(created.name).toBe("نینتندو");

      await expect(adminService.deleteTag(5)).resolves.toBeUndefined();
    });

    it("ensureTagsExist finds existing tags and creates only missing ones without duplicates", async () => {
      const existingTags: TagDto[] = [
        { id: 1, name: "پلی‌استیشن", slug: "ps5" },
        { id: 2, name: "ایکس‌باکس", slug: "xbox" },
      ];
      blogApiService.getTags = mock(async () => [...existingTags]);
      blogApiService.createTag = mock(async (req) => {
        const newTag: TagDto = { id: 3, name: req.name, slug: req.slug };
        existingTags.push(newTag);
        return newTag;
      });

      // Pass duplicate tag names & existing tag
      const tagNames = ["پلی‌استیشن", "  پلی‌استیشن  ", "بازی آنلاین", "بازی آنلاین"];
      const tagIds = await adminService.ensureTagsExist(tagNames);

      expect(tagIds).toContain(1);
      expect(tagIds).toContain(3);
      expect(tagIds).toHaveLength(2);
      expect(blogApiService.createTag).toHaveBeenCalledTimes(1);
    });

    it("sends tag_ids to Article Create and Patch payloads", async () => {
      let sentCreatePayload: any = null;
      blogApiService.createArticle = mock(async (req) => {
        sentCreatePayload = req;
        return { id: 1 } as unknown as ArticleDetailDto;
      });

      const input: AdminBlogPostInput = {
        title: "مقاله همراه تگ",
        slug: "article-with-tags",
        excerpt: "چکیده مقاله",
        category: "5",
        authorName: "تحریریه",
        readingMinutes: 4,
        coverUrl: "/img/gamnet-1.webp",
        tags: ["تگ ۱"],
        tagIds: [12, 18],
        status: "DRAFT",
        content: [],
      };

      await adminService.createBlogPost(input);
      expect(sentCreatePayload.tag_ids).toEqual([12, 18]);

      const patchReq = mapAdminInputToPatchRequest({ tags: ["جدید"] }, undefined, [25]);
      expect(patchReq.tag_ids).toEqual([25]);
    });
  });

  // 3. Media Upload & Attachment
  describe("3. Media Upload & Attachment", () => {
    it("uploads media with FormData and receives id and url", async () => {
      const mockMedia: MediaDetailDto = {
        id: 777,
        storage_key: "media/2026/img-1.webp",
        url: "http://51.20.249.108/media/2026/img-1.webp",
        type: "image",
        mime: "image/webp",
        created_at: "2026-10-10T10:00:00Z",
        updated_at: "2026-10-10T10:00:00Z",
      };

      blogApiService.uploadMedia = mock(async (input) => {
        expect(input.file).toBeDefined();
        expect(input.title).toBe("تصویر بنر");
        expect(input.alt_text).toBe("متن جایگزین بنر");
        return mockMedia;
      });

      const dummyFile = new Blob(["test-image-content"], { type: "image/webp" });
      const res = await adminService.uploadMedia({
        file: dummyFile,
        title: "تصویر بنر",
        alt_text: "متن جایگزین بنر",
      });

      expect(res.id).toBe(777);
      expect(res.url).toBe("http://51.20.249.108/media/2026/img-1.webp");
    });

    it("attaches cover_image_id to article create and patch requests", async () => {
      let sentCreatePayload: any = null;
      blogApiService.createArticle = mock(async (req) => {
        sentCreatePayload = req;
        return { id: 1 } as unknown as ArticleDetailDto;
      });

      const input: AdminBlogPostInput = {
        title: "مقاله همراه مدیا",
        slug: "article-with-media",
        excerpt: "چکیده مقاله مدیا",
        category: "1",
        authorName: "تحریریه",
        readingMinutes: 5,
        coverUrl: "http://example.com/uploaded.webp",
        coverImageId: 777,
        tags: [],
        status: "DRAFT",
        content: [],
      };

      await adminService.createBlogPost(input);
      expect(sentCreatePayload.cover_image_id).toBe("777");

      const patchReq = mapAdminInputToPatchRequest({}, undefined, undefined, "777");
      expect(patchReq.cover_image_id).toBe("777");
    });

    it("handles media upload failure cleanly", async () => {
      blogApiService.uploadMedia = mock(async () => {
        throw new Error("حجم فایل بیشتر از حد مجاز سرور است (413 Payload Too Large).");
      });

      const dummyFile = new Blob(["large-image"], { type: "image/jpeg" });
      await expect(
        adminService.uploadMedia({ file: dummyFile, title: "تصویر خطا" })
      ).rejects.toThrow("حجم فایل بیشتر از حد مجاز سرور است");
    });
  });

  // 4. Content Blocks Structure & Definitions
  describe("4. Content Blocks Structure", () => {
    it("maps heading, paragraph, list, and quote blocks to text and structured content_blocks", () => {
      const blocks: BlogContentBlock[] = [
        { type: "heading", text: "تیتر اصلی" },
        { type: "paragraph", text: "این یک پاراگراف نمونه است." },
        { type: "quote", text: "یک نقل قول برجسته" },
        { type: "list", items: ["مورد اول", "مورد دوم"] },
      ];

      const { content, content_blocks } = mapBlocksToApi(blocks);

      expect(content).toContain("## تیتر اصلی");
      expect(content).toContain("این یک پاراگراف نمونه است.");
      expect(content).toContain("> یک نقل قول برجسته");
      expect(content).toContain("- مورد اول\n- مورد دوم");

      expect(content_blocks).toHaveLength(4);
      expect(content_blocks[0]).toEqual({ type: "heading", text: "تیتر اصلی" });
      expect(content_blocks[1]).toEqual({ type: "paragraph", text: "این یک پاراگراف نمونه است." });
      expect(content_blocks[2]).toEqual({ type: "quote", text: "یک نقل قول برجسته" });
      expect(content_blocks[3]).toEqual({ type: "list", items: ["مورد اول", "مورد دوم"] });
    });

    it("restores content blocks during editing without losing blocks", () => {
      const apiBlocks = [
        { type: "heading", text: "تیتر سرور" },
        { type: "paragraph", text: "پاراگراف سرور" },
        { type: "list", items: ["آیتم ۱", "آیتم ۲"] },
        { type: "quote", text: "نقل‌قول سرور" },
      ];

      const restored = mapBlocksToUi(apiBlocks);
      expect(restored).toHaveLength(4);
      expect(restored[0]).toEqual({ type: "heading", text: "تیتر سرور" });
      expect(restored[1]).toEqual({ type: "paragraph", text: "پاراگراف سرور" });
      expect(restored[2]).toEqual({ type: "list", items: ["آیتم ۱", "آیتم ۲"] });
      expect(restored[3]).toEqual({ type: "quote", text: "نقل‌قول سرور" });
    });

    it("fetches block definitions from GET /api/articles/block-definitions/", async () => {
      const mockDefs: BlockDefinitionDto[] = [
        { name: "heading", schema: { type: "string" } },
        { name: "paragraph", schema: { type: "string" } },
      ];
      blogApiService.getBlockDefinitions = mock(async () => mockDefs);

      const defs = await adminService.getBlockDefinitions();
      expect(defs).toHaveLength(2);
      expect(defs[0].name).toBe("heading");
    });
  });

  // 5. Authors Integration
  describe("5. Authors Integration", () => {
    it("fetches author profiles from GET /api/authors/", async () => {
      const mockAuthors: AuthorProfileDto[] = [
        { user: 1, display_name: "مدیر وبلاگ", bio: "بیوگرافی مدیر", avatar: null },
        { user: 2, display_name: "نویسنده ارشد", bio: "نویسنده تخصصی", avatar: "/avatars/2.png" },
      ];
      blogApiService.getAuthors = mock(async () => mockAuthors);

      const authors = await adminService.getAuthorsList();
      expect(authors).toHaveLength(2);
      expect(authors[0].display_name).toBe("مدیر وبلاگ");
      expect(authors[1].display_name).toBe("نویسنده ارشد");
    });
  });
});
