// Allocates/claims ids for SSML placeholders (<readium:noteref id="..." />
// and friends), shared across sub-Converters — see Converter.idAlloc.
export class IdAllocator {
  private claimed = new Set<string>();
  private counters = new Map<string, number>();

  // `isTaken` additionally excludes ids already in use elsewhere (e.g. a
  // real author-written id in the document) that this allocator has no way
  // of knowing about on its own.
  allocate(prefix: string, isTaken: (id: string) => boolean): string {
    for (;;) {
      const n = (this.counters.get(prefix) ?? 0) + 1;
      this.counters.set(prefix, n);
      const id = `${prefix}${n}`;
      if (isTaken(id) || this.claimed.has(id)) continue;
      this.claimed.add(id);
      return id;
    }
  }

  claim(id: string): boolean {
    if (this.claimed.has(id)) return false;
    this.claimed.add(id);
    return true;
  }
}
