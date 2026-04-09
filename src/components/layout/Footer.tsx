export function Footer() {
  return (
    <>
      <div className="bg-[#EDD4D7] dark:bg-stone-900 h-px w-full" />
      <footer className="w-full bg-[#F8F4F3] dark:bg-stone-950 flex flex-col md:flex-row justify-between items-center px-8 py-12 gap-4">
        <div className="font-serif font-bold text-[#881D28] dark:text-[#EDD4D7] text-lg">
          DQFB Business
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <a
            href="#"
            className="font-body uppercase text-[10px] tracking-[0.2em] text-stone-400 dark:text-stone-500 hover:text-[#881D28] transition-all opacity-90 hover:opacity-100"
          >
            Privacy Policy
          </a>
          <a
            href="#"
            className="font-body uppercase text-[10px] tracking-[0.2em] text-stone-400 dark:text-stone-500 hover:text-[#881D28] transition-all opacity-90 hover:opacity-100"
          >
            Terms of Service
          </a>
          <a
            href="#"
            className="font-body uppercase text-[10px] tracking-[0.2em] text-stone-400 dark:text-stone-500 hover:text-[#881D28] transition-all opacity-90 hover:opacity-100"
          >
            Contact Support
          </a>
        </div>
        <div className="font-body uppercase text-[10px] tracking-[0.2em] text-[#881D28] dark:text-[#EDD4D7]">
          © 2026 DQFB Business. Editorial Excellence in Finance.
        </div>
      </footer>
    </>
  );
}
