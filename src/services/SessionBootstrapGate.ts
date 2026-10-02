/** Token refreshes and repeated sign-in notifications do not reinitialize one account. */
export class SessionBootstrapGate {
  private identity: string | null = null;
  begin(identity: string) {
    if (this.identity === identity) return false;
    this.identity = identity;
    return true;
  }
  reset() {
    this.identity = null;
  }
}
