/** The page scrolls inside .main-content (the window itself never scrolls), so scroll that. */
export const scrollToTop = (smooth = true) =>
  document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
