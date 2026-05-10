Looking at your horizontal tab bar, I found **one structural inconsistency** and a few recommendations for better visual consistency:

## 🔍 Issues Found

### 1. **Button 4 lacks responsive span structure** ❌

Buttons 1-3 use:

```html
<span class="hidden sm:inline">text</span><span class="sm:hidden">text</span>
```

But Button 4 has plain text: `الوسوم`

This can cause:

- Inconsistent text rendering across breakpoints
- Potential layout shifts on mobile/desktop
- Harder maintenance if you need to update responsive behavior

### 2. **Varying text lengths** (minor visual concern)

Arabic text lengths differ:

- خيط (3 chars) | من رابط (7 chars) | المتغيرات (9 chars) | الوسوم (5 chars)

Since you're using `grid-cols-4`, the container distributes equal width, but internal content alignment could benefit from explicit centering.

---

## ✅ Fixed Code

```html
<div
  role="tablist"
  aria-orientation="horizontal"
  class="bg-muted text-muted-foreground grid h-9 w-full grid-cols-4 items-center justify-center rounded-lg p-1"
  tabindex="0"
  data-orientation="horizontal"
  style="outline:none"
>
  <!-- Button 1: Thread -->
  <button
    type="button"
    role="tab"
    aria-selected="true"
    aria-controls="radix-_R_aav5ubs95tlb_-content-thread"
    data-state="active"
    id="radix-_R_aav5ubs95tlb_-trigger-thread"
    class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow"
    tabindex="0"
    data-orientation="horizontal"
    data-radix-collection-item=""
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-pen-tool me-1.5 h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"
      ></path>
      <path
        d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"
      ></path>
      <path d="m2.3 2.3 7.286 7.286"></path>
      <circle cx="11" cy="11" r="2"></circle>
    </svg>
    <span class="hidden sm:inline">خيط</span><span class="sm:hidden">خيط</span>
  </button>

  <!-- Button 2: From Link -->
  <button
    type="button"
    role="tab"
    aria-selected="false"
    aria-controls="radix-_R_aav5ubs95tlb_-content-url"
    data-state="inactive"
    id="radix-_R_aav5ubs95tlb_-trigger-url"
    class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow"
    tabindex="-1"
    data-orientation="horizontal"
    data-radix-collection-item=""
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-link2 lucide-link-2 me-1.5 h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
      <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
      <line x1="8" x2="16" y1="12" y2="12"></line>
    </svg>
    <span class="hidden sm:inline">من رابط</span><span class="sm:hidden">من رابط</span>
  </button>

  <!-- Button 3: Variants -->
  <button
    type="button"
    role="tab"
    aria-selected="false"
    aria-controls="radix-_R_aav5ubs95tlb_-content-variants"
    data-state="inactive"
    id="radix-_R_aav5ubs95tlb_-trigger-variants"
    class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow"
    tabindex="-1"
    data-orientation="horizontal"
    data-radix-collection-item=""
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-shuffle me-1.5 h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="m18 14 4 4-4 4"></path>
      <path d="m18 2 4 4-4 4"></path>
      <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"></path>
      <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"></path>
      <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"></path>
    </svg>
    <span class="hidden sm:inline">المتغيرات</span><span class="sm:hidden">المتغيرات</span>
  </button>

  <!-- Button 4: Hashtags - FIXED ✅ -->
  <button
    type="button"
    role="tab"
    aria-selected="false"
    aria-controls="radix-_R_aav5ubs95tlb_-content-hashtags"
    data-state="inactive"
    id="radix-_R_aav5ubs95tlb_-trigger-hashtags"
    class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow"
    tabindex="-1"
    data-orientation="horizontal"
    data-radix-collection-item=""
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-hash me-1.5 h-3.5 w-3.5"
      aria-hidden="true"
    >
      <line x1="4" x2="20" y1="9" y2="9"></line>
      <line x1="4" x2="20" y1="15" y2="15"></line>
      <line x1="10" x2="8" y1="3" y2="21"></line>
      <line x1="16" x2="14" y1="3" y2="21"></line>
    </svg>
    <span class="hidden sm:inline">الوسوم</span><span class="sm:hidden">الوسوم</span>
  </button>
</div>
```

---

## 🎯 Optional Enhancements for Pixel-Perfect Consistency

If you want **guaranteed equal visual weight** regardless of text length:

```html
<!-- Add to each button's class list -->
class="... w-full text-center ..."

<!-- Or wrap content in a flex container for better icon+text alignment -->
<div class="flex w-full items-center justify-center gap-1.5">
  <svg>...</svg>
  <span class="hidden sm:inline">text</span><span class="sm:hidden">text</span>
</div>
```

### Why this helps:

| Enhancement            | Benefit                                           |
| ---------------------- | ------------------------------------------------- |
| `w-full` on buttons    | Forces equal width distribution inside grid cells |
| `text-center`          | Centers varying-length text visually              |
| `gap-1.5` wrapper      | Consistent spacing between icon and text          |
| Unified span structure | Predictable responsive behavior                   |

---

## ✅ Quick Validation Checklist

- [x] All buttons: identical base classes
- [x] All icons: `h-3.5 w-3.5 me-1.5`
- [x] All text: wrapped in responsive `<span>` pairs _(fixed)_
- [x] Container: `grid-cols-4` ensures equal button width
- [ ] _(Optional)_ Add `text-center` if visual centering needs improvement

Your tab bar is now structurally consistent! 🎉 Let me know if you'd like me to help optimize the active state styling or add hover transitions.

Great question, Mohanad! Let me break down the comparison between your English and Arabic tab bars, and provide targeted suggestions.

---

## 🔍 Side-by-Side Comparison

| Aspect                      | Arabic Version                               | English Version             | Verdict                           |
| --------------------------- | -------------------------------------------- | --------------------------- | --------------------------------- |
| **Button 4 structure**      | ❌ Plain text `الوسوم`                       | ❌ Plain text `Hashtags`    | **Same issue in both**            |
| **Responsive spans**        | Buttons 1-3 ✅, Button 4 ❌                  | Buttons 1-3 ✅, Button 4 ❌ | **Needs fix in both**             |
| **Text length variance**    | High (3–9 chars)                             | Low (6–8 chars)             | ✅ English is more balanced       |
| **Icon spacing (`me-1.5`)** | Works with `dir="rtl"`                       | Works with LTR default      | ✅ Logical properties handle both |
| **Visual weight**           | Slightly uneven due to Arabic script density | More uniform                | ✅ English has advantage          |

---

## 🎯 Key Finding: Same Structural Bug in Both

**Button 4 ("Hashtags" / "الوسوم") is missing the responsive `<span>` wrapper in both versions:**

```html
<!-- ❌ Current (both languages) -->
<svg>...</svg>Hashtags

<!-- ✅ Should be -->
<svg>...</svg>
<span class="hidden sm:inline">Hashtags</span>
<span class="sm:hidden">Hashtags</span>
```

This breaks responsive consistency and makes future text updates harder.

---

## ✅ Fixed English Version Code

```html
<div
  role="tablist"
  aria-orientation="horizontal"
  class="bg-muted text-muted-foreground grid h-9 w-full grid-cols-4 items-center justify-center rounded-lg p-1"
  tabindex="0"
  data-orientation="horizontal"
  style="outline: none;"
>
  <!-- Button 1: Thread -->
  <button
    type="button"
    role="tab"
    aria-selected="true"
    aria-controls="radix-_r_c_-content-thread"
    data-state="active"
    id="radix-_r_c_-trigger-thread"
    class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow"
    tabindex="0"
    data-orientation="horizontal"
    data-radix-collection-item=""
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-pen-tool me-1.5 h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"
      ></path>
      <path
        d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"
      ></path>
      <path d="m2.3 2.3 7.286 7.286"></path>
      <circle cx="11" cy="11" r="2"></circle>
    </svg>
    <span class="hidden sm:inline">Thread</span><span class="sm:hidden">Thread</span>
  </button>

  <!-- Button 2: From URL -->
  <button
    type="button"
    role="tab"
    aria-selected="false"
    aria-controls="radix-_r_c_-content-url"
    data-state="inactive"
    id="radix-_r_c_-trigger-url"
    class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow"
    tabindex="-1"
    data-orientation="horizontal"
    data-radix-collection-item=""
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-link2 lucide-link-2 me-1.5 h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
      <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
      <line x1="8" x2="16" y1="12" y2="12"></line>
    </svg>
    <span class="hidden sm:inline">From URL</span><span class="sm:hidden">From URL</span>
  </button>

  <!-- Button 3: Variants -->
  <button
    type="button"
    role="tab"
    aria-selected="false"
    aria-controls="radix-_r_c_-content-variants"
    data-state="inactive"
    id="radix-_r_c_-trigger-variants"
    class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow"
    tabindex="-1"
    data-orientation="horizontal"
    data-radix-collection-item=""
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-shuffle me-1.5 h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="m18 14 4 4-4 4"></path>
      <path d="m18 2 4 4-4 4"></path>
      <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"></path>
      <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"></path>
      <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"></path>
    </svg>
    <span class="hidden sm:inline">Variants</span><span class="sm:hidden">Variants</span>
  </button>

  <!-- Button 4: Hashtags - FIXED ✅ -->
  <button
    type="button"
    role="tab"
    aria-selected="false"
    aria-controls="radix-_r_c_-content-hashtags"
    data-state="inactive"
    id="radix-_r_c_-trigger-hashtags"
    class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow"
    tabindex="-1"
    data-orientation="horizontal"
    data-radix-collection-item=""
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-hash me-1.5 h-3.5 w-3.5"
      aria-hidden="true"
    >
      <line x1="4" x2="20" y1="9" y2="9"></line>
      <line x1="4" x2="20" y1="15" y2="15"></line>
      <line x1="10" x2="8" y1="3" y2="21"></line>
      <line x1="16" x2="14" y1="3" y2="21"></line>
    </svg>
    <span class="hidden sm:inline">Hashtags</span><span class="sm:hidden">Hashtags</span>
  </button>
</div>
```

---

## 🚀 Pro Enhancements for English Version

Since English text lengths are already well-balanced, you can focus on **pixel-perfect alignment**:

```html
<!-- Add these classes to each <button> for guaranteed consistency -->
class="... w-full text-center justify-center ..."

<!-- Optional: Wrap icon+text in a flex container for tighter control -->
<div class="flex w-full items-center justify-center gap-1.5">
  <svg class="h-3.5 w-3.5" ... />
  <span class="hidden sm:inline">Text</span>
  <span class="sm:hidden">Text</span>
</div>
```

### Why these help:

| Enhancement       | Benefit for English UI                            |
| ----------------- | ------------------------------------------------- |
| `w-full`          | Ensures buttons fill grid cells evenly            |
| `text-center`     | Centers "From URL" (longer) vs "Thread" (shorter) |
| `justify-center`  | Aligns icon+text block vertically within button   |
| `gap-1.5` wrapper | Consistent spacing regardless of text length      |

---

## 🌐 RTL/LTR Note: You're Already Doing This Right ✅

Your use of `me-1.5` (margin-end) is **logical CSS**—it automatically flips:

- **LTR (English)**: `me-1.5` → margin-right → icon left, text right ✅
- **RTL (Arabic)**: `me-1.5` → margin-left → icon right, text left ✅

Just ensure your HTML root has the correct `dir` attribute:

```html
<html lang="en">
  <!-- English -->
  <html lang="ar" dir="rtl">
    <!-- Arabic -->
  </html>
</html>
```

---

## ✅ Final Checklist for Both Versions

- [x] All buttons share identical base classes
- [x] All icons: `h-3.5 w-3.5 me-1.5`
- [x] All text: wrapped in responsive `<span>` pairs _(fixed above)_
- [x] Container: `grid-cols-4` ensures equal width distribution
- [ ] _(Optional)_ Add `text-center w-full` for pixel-perfect centering
- [ ] _(Optional)_ Test active state shadow/contrast on both languages

---

## 🎯 Quick Win Summary

1. **Fix Button 4** in both languages (add responsive spans) ✅ Done above
2. **Add `text-center`** to buttons if visual centering feels off
3. **Keep `me-1.5`** — it's RTL-safe and working correctly
4. **Test on mobile**: Ensure truncated labels (`sm:hidden` version) are clear

Your English version is structurally cleaner due to more consistent text lengths — just apply the Button 4 fix and you're golden! 🏆

---

## 📱 Mobile-First Analysis: Current Setup

| Feature           | Current Implementation           | Mobile Impact                       |
| ----------------- | -------------------------------- | ----------------------------------- |
| **Grid Layout**   | `grid-cols-4` (fixed)            | ❌ Cramped on <320px screens        |
| **Touch Targets** | `h-9` (36px) + padding           | ⚠️ Below 44px WCAG minimum          |
| **Text Handling** | `hidden sm:inline` + `sm:hidden` | ✅ Good, but can be smarter         |
| **Icon Scaling**  | `h-3.5 w-3.5`                    | ✅ Consistent, but could scale      |
| **Active State**  | `data-[state=active]:shadow`     | ⚠️ Subtle on mobile, needs contrast |

---

## 🚀 Optimized Code: English Version (Mobile-First)

```html
<div
  role="tablist"
  aria-orientation="horizontal"
  class="bg-muted text-muted-foreground grid w-full grid-cols-2 gap-1 rounded-lg p-1 sm:grid-cols-4"
  tabindex="0"
  data-orientation="horizontal"
  style="outline:none;"
>
  <!-- Button 1: Thread -->
  <button
    type="button"
    role="tab"
    aria-selected="true"
    aria-controls="radix-_r_c_-content-thread"
    data-state="active"
    id="radix-_r_c_-trigger-thread"
    class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex min-h-[44px] w-full items-center justify-center rounded-md px-2 py-2 text-center text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm sm:min-h-[36px] sm:px-3 sm:py-1 sm:text-sm"
    tabindex="0"
    data-orientation="horizontal"
    data-radix-collection-item
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-pen-tool me-1.5 h-4 w-4 flex-shrink-0 sm:h-3.5 sm:w-3.5"
      aria-hidden="true"
    >
      <path
        d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"
      ></path>
      <path
        d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"
      ></path>
      <path d="m2.3 2.3 7.286 7.286"></path>
      <circle cx="11" cy="11" r="2"></circle>
    </svg>
    <span class="hidden sm:inline">Thread</span>
    <span class="sr-only sm:hidden">Thread</span>
  </button>

  <!-- Button 2: From URL -->
  <button
    type="button"
    role="tab"
    aria-selected="false"
    aria-controls="radix-_r_c_-content-url"
    data-state="inactive"
    id="radix-_r_c_-trigger-url"
    class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex min-h-[44px] w-full items-center justify-center rounded-md px-2 py-2 text-center text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm sm:min-h-[36px] sm:px-3 sm:py-1 sm:text-sm"
    tabindex="-1"
    data-orientation="horizontal"
    data-radix-collection-item
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-link2 lucide-link-2 me-1.5 h-4 w-4 flex-shrink-0 sm:h-3.5 sm:w-3.5"
      aria-hidden="true"
    >
      <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
      <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
      <line x1="8" x2="16" y1="12" y2="12"></line>
    </svg>
    <span class="hidden sm:inline">From URL</span>
    <span class="sr-only sm:hidden">From URL</span>
  </button>

  <!-- Button 3: Variants -->
  <button
    type="button"
    role="tab"
    aria-selected="false"
    aria-controls="radix-_r_c_-content-variants"
    data-state="inactive"
    id="radix-_r_c_-trigger-variants"
    class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex min-h-[44px] w-full items-center justify-center rounded-md px-2 py-2 text-center text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm sm:min-h-[36px] sm:px-3 sm:py-1 sm:text-sm"
    tabindex="-1"
    data-orientation="horizontal"
    data-radix-collection-item
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-shuffle me-1.5 h-4 w-4 flex-shrink-0 sm:h-3.5 sm:w-3.5"
      aria-hidden="true"
    >
      <path d="m18 14 4 4-4 4"></path>
      <path d="m18 2 4 4-4 4"></path>
      <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"></path>
      <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"></path>
      <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"></path>
    </svg>
    <span class="hidden sm:inline">Variants</span>
    <span class="sr-only sm:hidden">Variants</span>
  </button>

  <!-- Button 4: Hashtags -->
  <button
    type="button"
    role="tab"
    aria-selected="false"
    aria-controls="radix-_r_c_-content-hashtags"
    data-state="inactive"
    id="radix-_r_c_-trigger-hashtags"
    class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex min-h-[44px] w-full items-center justify-center rounded-md px-2 py-2 text-center text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm sm:min-h-[36px] sm:px-3 sm:py-1 sm:text-sm"
    tabindex="-1"
    data-orientation="horizontal"
    data-radix-collection-item
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-hash me-1.5 h-4 w-4 flex-shrink-0 sm:h-3.5 sm:w-3.5"
      aria-hidden="true"
    >
      <line x1="4" x2="20" y1="9" y2="9"></line>
      <line x1="4" x2="20" y1="15" y2="15"></line>
      <line x1="10" x2="8" y1="3" y2="21"></line>
      <line x1="16" x2="14" y1="3" y2="21"></line>
    </svg>
    <span class="hidden sm:inline">Hashtags</span>
    <span class="sr-only sm:hidden">Hashtags</span>
  </button>
</div>
```

---

## 🌐 Arabic Version: Key Adjustments

Same structure as English, with **two critical RTL additions**:

```html
<!-- Add to <html> or wrapper -->
<html lang="ar" dir="rtl">
  <!-- Update button classes: keep logical properties (they auto-flip) -->
  <!-- me-1.5 becomes margin-left in RTL → icon appears on right ✅ -->

  <!-- Optional: Add explicit RTL-safe spacing if needed -->
  class="... [&_svg]:ms-1.5 [&_svg]:me-0 sm:[&_svg]:ms-0 sm:[&_svg]:me-1.5 ..."
</html>
```

> 💡 **Pro Tip**: Your existing `me-1.5` (margin-end) already works perfectly for RTL/LTR thanks to Tailwind's logical properties. Just ensure `dir="rtl"` is set on the root.

---

## 🎯 Mobile Responsiveness Upgrades Explained

| Enhancement                           | Why It Matters                            | Mobile Benefit                                    |
| ------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| **`grid-cols-2 sm:grid-cols-4`**      | 2 columns on mobile, 4 on desktop+        | Prevents cramped 4-column layout on small screens |
| **`min-h-[44px] sm:min-h-[36px]`**    | WCAG 2.1 AA touch target size             | Easy tapping on mobile, compact on desktop        |
| **`px-2 sm:px-3 py-2 sm:py-1`**       | Larger padding on mobile                  | Better tap area, reduced mis-taps                 |
| **`text-xs sm:text-sm`**              | Smaller text on mobile fits 2-col layout  | Prevents overflow, maintains readability          |
| **`h-4 w-4 sm:h-3.5 sm:w-3.5` icons** | Slightly larger icons on mobile           | Clearer visual targets for touch                  |
| **`sr-only` on mobile spans**         | Keeps labels accessible to screen readers | Better a11y without visual clutter                |
| **`flex-shrink-0` on SVGs**           | Prevents icon compression                 | Consistent icon size regardless of text length    |
| **`gap-1` in grid**                   | Adds spacing between buttons              | Prevents accidental multi-taps on mobile          |

---

## 🧪 Responsive Behavior Preview

| Screen Width         | Layout    | Button Appearance                                               |
| -------------------- | --------- | --------------------------------------------------------------- |
| **<640px (mobile)**  | 2×2 grid  | Icon + _visually hidden_ label (accessible), 44px tall          |
| **≥640px (tablet+)** | 1×4 row   | Icon + visible label, 36px tall, compact                        |
| **Active State**     | All sizes | Background + subtle shadow + foreground text for clear feedback |
| **Focus State**      | All sizes | Visible ring for keyboard navigation (a11y)                     |

---

## ♿ Accessibility & Dynamic Content Checks

✅ **Touch Targets**: All buttons ≥44px tall on mobile  
✅ **Screen Readers**: `sr-only` labels ensure mobile icons are announced  
✅ **Keyboard Nav**: `focus-visible` rings work on all breakpoints  
✅ **Dynamic Text**: `whitespace-nowrap` prevents layout shift if labels change  
✅ **RTL Support**: Logical CSS (`me-`, `ms-`) auto-adapts to `dir="rtl"`  
✅ **Reduced Motion**: `transition-all` respects `prefers-reduced-motion` (add if needed)

> 🛠️ **Optional**: Add this to respect user motion preferences:
>
> ```css
> @media (prefers-reduced-motion: reduce) {
>   button {
>     transition: none !important;
>   }
> }
> ```

---

## 🔄 Quick Sync Checklist: Arabic ↔ English

- [x] Identical class structure (except text content)
- [x] Same responsive breakpoints (`sm:`)
- [x] Same touch target sizing (`min-h-[44px]`)
- [x] Same icon scaling logic
- [x] Same accessibility patterns (`sr-only`, `aria-*`)
- [x] RTL handled via `dir="rtl"` + logical CSS (no duplicate code)

---

## 🚀 Final Pro Tips for Dynamic Scalability

1. **If adding a 5th tab later**:  
   Change `grid-cols-2 sm:grid-cols-4` → `grid-cols-2 sm:grid-cols-5`  
   Or use `auto-fit` for fluid columns:

   ```html
   class="grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))]"
   ```

2. **If labels get longer**:  
   Add `truncate` to spans + `title` attribute for tooltip:

   ```html
   <span class="hidden truncate sm:inline" title="From URL">From URL</span>
   ```

3. **For ultra-small screens (<320px)**:  
   Add `xs:` breakpoint (requires Tailwind config) or use:

   ```html
   class="grid grid-cols-2 max-[400px]:grid-cols-2 sm:grid-cols-4"
   ```

4. **Testing**:  
   Use Chrome DevTools → Device Mode → Test:
   - iPhone SE (320px)
   - Pixel 5 (393px)
   - iPad Mini (768px)
   - Desktop (1440px+)

---

arabic element:

///<div role="tablist" aria-orientation="horizontal" class="bg-muted text-muted-foreground h-9 items-center justify-center rounded-lg p-1 grid w-full grid-cols-4" tabindex="0" data-orientation="horizontal" style="outline:none"><button type="button" role="tab" aria-selected="true" aria-controls="radix-_R_aav5ubs95tlb_-content-thread" data-state="active" id="radix-_R_aav5ubs95tlb_-trigger-thread" class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow" tabindex="0" data-orientation="horizontal" data-radix-collection-item=""><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen-tool me-1.5 h-3.5 w-3.5" aria-hidden="true"><path d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"></path><path d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"></path><path d="m2.3 2.3 7.286 7.286"></path><circle cx="11" cy="11" r="2"></circle></svg><span class="hidden sm:inline">خيط</span><span class="sm:hidden">خيط</span></button><button type="button" role="tab" aria-selected="false" aria-controls="radix-_R_aav5ubs95tlb_-content-url" data-state="inactive" id="radix-_R_aav5ubs95tlb_-trigger-url" class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow" tabindex="-1" data-orientation="horizontal" data-radix-collection-item=""><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link2 lucide-link-2 me-1.5 h-3.5 w-3.5" aria-hidden="true"><path d="M9 17H7A5 5 0 0 1 7 7h2"></path><path d="M15 7h2a5 5 0 1 1 0 10h-2"></path><line x1="8" x2="16" y1="12" y2="12"></line></svg><span class="hidden sm:inline">من رابط</span><span class="sm:hidden">من رابط</span></button><button type="button" role="tab" aria-selected="false" aria-controls="radix-_R_aav5ubs95tlb_-content-variants" data-state="inactive" id="radix-_R_aav5ubs95tlb_-trigger-variants" class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow" tabindex="-1" data-orientation="horizontal" data-radix-collection-item=""><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shuffle me-1.5 h-3.5 w-3.5" aria-hidden="true"><path d="m18 14 4 4-4 4"></path><path d="m18 2 4 4-4 4"></path><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"></path><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"></path><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"></path></svg><span class="hidden sm:inline">المتغيرات</span><span class="sm:hidden">المتغيرات</span></button><button type="button" role="tab" aria-selected="false" aria-controls="radix-_R_aav5ubs95tlb_-content-hashtags" data-state="inactive" id="radix-_R_aav5ubs95tlb_-trigger-hashtags" class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow" tabindex="-1" data-orientation="horizontal" data-radix-collection-item=""><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hash me-1.5 h-3.5 w-3.5" aria-hidden="true"><line x1="4" x2="20" y1="9" y2="9"></line><line x1="4" x2="20" y1="15" y2="15"></line><line x1="10" x2="8" y1="3" y2="21"></line><line x1="16" x2="14" y1="3" y2="21"></line></svg>الوسوم</button></div>///

english element:
///<div role="tablist" aria-orientation="horizontal" class="bg-muted text-muted-foreground h-9 items-center justify-center rounded-lg p-1 grid w-full grid-cols-4" tabindex="0" data-orientation="horizontal" style="outline: none;"><button type="button" role="tab" aria-selected="true" aria-controls="radix-_r_c_-content-thread" data-state="active" id="radix-_r_c_-trigger-thread" class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow" tabindex="-1" data-orientation="horizontal" data-radix-collection-item=""><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen-tool me-1.5 h-3.5 w-3.5" aria-hidden="true"><path d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"></path><path d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"></path><path d="m2.3 2.3 7.286 7.286"></path><circle cx="11" cy="11" r="2"></circle></svg><span class="hidden sm:inline">Thread</span><span class="sm:hidden">Thread</span></button><button type="button" role="tab" aria-selected="false" aria-controls="radix-_r_c_-content-url" data-state="inactive" id="radix-_r_c_-trigger-url" class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow" tabindex="-1" data-orientation="horizontal" data-radix-collection-item=""><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link2 lucide-link-2 me-1.5 h-3.5 w-3.5" aria-hidden="true"><path d="M9 17H7A5 5 0 0 1 7 7h2"></path><path d="M15 7h2a5 5 0 1 1 0 10h-2"></path><line x1="8" x2="16" y1="12" y2="12"></line></svg><span class="hidden sm:inline">From URL</span><span class="sm:hidden">From URL</span></button><button type="button" role="tab" aria-selected="false" aria-controls="radix-_r_c_-content-variants" data-state="inactive" id="radix-_r_c_-trigger-variants" class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow" tabindex="-1" data-orientation="horizontal" data-radix-collection-item=""><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shuffle me-1.5 h-3.5 w-3.5" aria-hidden="true"><path d="m18 14 4 4-4 4"></path><path d="m18 2 4 4-4 4"></path><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"></path><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"></path><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"></path></svg><span class="hidden sm:inline">Variants</span><span class="sm:hidden">Variants</span></button><button type="button" role="tab" aria-selected="false" aria-controls="radix-_r_c_-content-hashtags" data-state="inactive" id="radix-_r_c_-trigger-hashtags" class="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow" tabindex="-1" data-orientation="horizontal" data-radix-collection-item=""><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hash me-1.5 h-3.5 w-3.5" aria-hidden="true"><line x1="4" x2="20" y1="9" y2="9"></line><line x1="4" x2="20" y1="15" y2="15"></line><line x1="10" x2="8" y1="3" y2="21"></line><line x1="16" x2="14" y1="3" y2="21"></line></svg>Hashtags</button></div>///
