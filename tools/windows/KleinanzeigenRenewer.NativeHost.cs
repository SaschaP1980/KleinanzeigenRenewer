// KAR-64 Wave 01: read-only Chrome Native Messaging host (.NET Framework / Windows).
// Installed per-user by Install-KleinanzeigenRenewer-NativeHost.ps1.
// One request per process (Chrome runtime.sendNativeMessage); no mutating operations.
using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Diagnostics;
using System.Collections.Generic;
using System.Globalization;
using System.Web.Script.Serialization;

internal static class Program {
    const int ProtocolVersion = 1;
    const int MaximumFrame = 8192;
    const string UpdaterFilename = "KleinanzeigenRenewer-Updater.ps1";
    static readonly UTF8Encoding Utf8 = new UTF8Encoding(false, true);
    static readonly Regex Id = new Regex("^[a-fA-F0-9]{16,64}$", RegexOptions.CultureInvariant);
    static readonly Regex CheckLine = new Regex(
        @"^CHECK: installed=(?<installed>not installed|[0-9]+\.[0-9]+\.[0-9]+) approved=(?<approved>[0-9]+\.[0-9]+\.[0-9]+) sha256=(?<sha>[a-f0-9]{64}) sourceCommit=(?<commit>[a-f0-9]{40})\r?$",
        RegexOptions.Multiline | RegexOptions.CultureInvariant);

    const string TrustedOrigin = "chrome-extension://hafahjhhgiipdegfkgacchmnacgblnah/";
    const string ParentWindowPrefix = "--parent-window=";

    static bool ValidChromeLaunch(string[] args) {
        // Chrome passes the caller origin first, and on Windows the numeric
        // parent-window handle second (0 for an MV3 service worker).
        // Do not permit any other origin or user-selected process arguments.
        if (args == null || args.Length != 2
            || (args[0] != TrustedOrigin
                && args[0] != TrustedOrigin.Substring(0, TrustedOrigin.Length - 1))
            || args[1] == null
            || !args[1].StartsWith(ParentWindowPrefix, StringComparison.Ordinal)) return false;
        string handle = args[1].Substring(ParentWindowPrefix.Length);
        ulong value;
        return handle.Length > 0 && handle.Length <= 20
            && ulong.TryParse(handle, NumberStyles.None, CultureInfo.InvariantCulture, out value);
    }

    static int Main(string[] args) {
        if (!ValidChromeLaunch(args)) return 2;
        try {
            using (Stream input = Console.OpenStandardInput()) {
                byte[] header = ReadExactly(input, 4);
                if (header == null) return 0;
                uint length = (uint)(header[0] | (header[1] << 8) | (header[2] << 16) | (header[3] << 24));
                if (length == 0 || length > MaximumFrame) { Write(Error(null, "FRAME_REJECTED")); return 1; }
                byte[] payload = ReadExactly(input, (int)length);
                if (payload == null) { Write(Error(null, "FRAME_TRUNCATED")); return 1; }
                Dictionary<string, object> message;
                try {
                    object value = new JavaScriptSerializer { MaxJsonLength = MaximumFrame, RecursionLimit = 6 }
                        .DeserializeObject(Utf8.GetString(payload));
                    message = value as Dictionary<string, object>;
                } catch { message = null; }
                if (message == null || message.Count != 3 || !message.ContainsKey("protocol")
                    || !message.ContainsKey("requestId") || !message.ContainsKey("operation")
                    || !(message["protocol"] is int) || (int)message["protocol"] != ProtocolVersion
                    || !(message["requestId"] is string) || !Id.IsMatch((string)message["requestId"])
                    || !(message["operation"] is string)) {
                    Write(Error(null, "INVALID_REQUEST")); return 1;
                }
                string requestId = (string)message["requestId"];
                string operation = (string)message["operation"];
                if (operation == "health") {
                    Write(new Dictionary<string, object> {
                        { "protocol", ProtocolVersion }, { "requestId", requestId },
                        { "ok", true }, { "operation", "health" }, { "hostVersion", "1" },
                        { "capabilities", new string[] { "health", "check", "inspect_transaction" } }
                    });
                    return 0;
                }
                if (operation == "inspect_transaction") {
                    Write(InspectTransaction(requestId)); return 0;
                }
                if (operation != "check") { Write(Error(requestId, "OPERATION_DENIED")); return 1; }
                Write(Check(requestId));
                return 0;
            }
        } catch { try { Write(Error(null, "HOST_FAILURE")); } catch { } return 1; }
    }

    static byte[] ReadExactly(Stream input, int size) {
        byte[] buffer = new byte[size];
        int received = 0;
        while (received < size) {
            int amount = input.Read(buffer, received, size - received);
            if (amount <= 0) return null;
            received += amount;
        }
        return buffer;
    }

    static Dictionary<string, object> Error(string requestId, string code) {
        return new Dictionary<string, object> {
            { "protocol", ProtocolVersion }, { "requestId", requestId },
            { "ok", false }, { "error", code }
        };
    }

    static void Write(Dictionary<string, object> value) {
        byte[] bytes = Utf8.GetBytes(new JavaScriptSerializer { MaxJsonLength = MaximumFrame }.Serialize(value));
        if (bytes.Length > MaximumFrame) throw new InvalidOperationException("response limit");
        Stream output = Console.OpenStandardOutput();
        uint n = (uint)bytes.Length;
        byte[] header = new byte[] { (byte)n, (byte)(n >> 8), (byte)(n >> 16), (byte)(n >> 24) };
        output.Write(header, 0, 4);
        output.Write(bytes, 0, bytes.Length);
        output.Flush();
    }


    // KAR-99 P1.3: read-only, negative-only NativeHost evidence. No transaction
    // token or MV3 generation is available from this Windows legacy updater.
    // Never call an updater, change a lock, or assert positive update IDLE.
    static string InspectRoot() {
        string testRoot = Environment.GetEnvironmentVariable("KAR_NATIVE_HOST_INSPECT_TEST_ROOT");
        if (!String.IsNullOrEmpty(testRoot)) {
            if (Environment.GetEnvironmentVariable("CI") != "true" ||
                Environment.GetEnvironmentVariable("KAR_NATIVE_HOST_TEST_MODE") != "1")
                return null;
            try {
                string temp = Path.GetFullPath(Path.GetTempPath())
                    .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                    + Path.DirectorySeparatorChar;
                string canonical = Path.GetFullPath(testRoot);
                return canonical.StartsWith(temp, StringComparison.OrdinalIgnoreCase) ? canonical : null;
            } catch { return null; }
        }
        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        return String.IsNullOrEmpty(local) ? null : Path.Combine(local, "KleinanzeigenRenewer");
    }

    static string ProbeFile(string name) {
        try {
            FileAttributes kind = File.GetAttributes(name);
            if ((kind & FileAttributes.Directory) != 0) return "unknown";
            return "present";
        } catch (FileNotFoundException) {
            return "absent";
        } catch (DirectoryNotFoundException) {
            return "absent";
        } catch {
            // File.Exists() is forbidden here: access/read errors must not
            // be silently equated with a safe missing transaction.
            return "unknown";
        }
    }

    static string CombineProof(string a, string b) {
        if (a == "present" || b == "present") return "present";
        if (a == "unknown" || b == "unknown") return "unknown";
        return "absent";
    }

    // R2: bounded, independent READ-ONLY evidence from the actual legacy
    // Windows updater journal. An authentic fingerprint proves only that
    // particular bytes were observed twice; legacy journals contain no MV3
    // transaction token or Worker generation and CANNOT prove terminality.
    static byte[] ReadBoundedJournal(string path) {
        using (FileStream file = new FileStream(path, FileMode.Open,
            FileAccess.Read, FileShare.ReadWrite | FileShare.Delete)) {
            if (file.Length > 32768 || file.Length < 0) throw new InvalidDataException();
            byte[] bytes = new byte[(int)file.Length];
            int offset = 0;
            while (offset < bytes.Length) {
                int n = file.Read(bytes, offset, bytes.Length - offset);
                if (n <= 0) throw new EndOfStreamException();
                offset += n;
            }
            if (file.ReadByte() != -1) throw new InvalidDataException();
            return bytes;
        }
    }

    static string LegacyJournalFormat(string path, out string fingerprint) {
        fingerprint = null;
        try {
            byte[] first = ReadBoundedJournal(path);
            byte[] second = ReadBoundedJournal(path);
            if (first.Length != second.Length) return "unknown";
            for (int i = 0; i < first.Length; i++)
                if (first[i] != second[i]) return "unknown";
            using (System.Security.Cryptography.SHA256 sha =
                System.Security.Cryptography.SHA256.Create()) {
                fingerprint = BitConverter.ToString(sha.ComputeHash(second))
                    .Replace("-", "").ToLowerInvariant();
            }
            Dictionary<string, object> record;
            try {
                record = new JavaScriptSerializer {
                    MaxJsonLength = 32768, RecursionLimit = 6
                }.DeserializeObject(Utf8.GetString(second)) as Dictionary<string, object>;
            } catch { return "malformed"; }
            if (record == null || record.Count != 5 ||
                !record.ContainsKey("schema") || !(record["schema"] is int) ||
                (int)record["schema"] != 1 ||
                !record.ContainsKey("backup") || !(record["backup"] is string) ||
                !Regex.IsMatch((string)record["backup"], @"^backup-[a-f0-9]{32}$") ||
                !record.ContainsKey("hadPrevious") || !(record["hadPrevious"] is bool) ||
                !record.ContainsKey("receipt") || !record.ContainsKey("target") ||
                !(record["target"] is string) ||
                !Regex.IsMatch((string)record["target"], @"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$") ||
                ((bool)record["hadPrevious"] && !(record["receipt"] is Dictionary<string, object>)) ||
                (!(bool)record["hadPrevious"] && record["receipt"] != null))
                return "malformed";
            return "legacy-pending";
        } catch { fingerprint = null; return "unknown"; }
    }

    // R2: independently inspect the installed Windows receipt written by
    // the manual updater. Stable bytes and a validated legacy schema are NOT
    // a terminal MV3 transaction witness: these receipts have no original
    // transactionId, P8 token, Worker generation or Chrome activation proof.
    static string LegacyInstalledReceipt(string path, out string fingerprint,
        out string version) {
        fingerprint = null;
        version = null;
        try {
            byte[] first = ReadBoundedJournal(path);
            byte[] second = ReadBoundedJournal(path);
            if (first.Length != second.Length) return "unknown";
            for (int i = 0; i < first.Length; i++)
                if (first[i] != second[i]) return "unknown";
            using (System.Security.Cryptography.SHA256 sha =
                System.Security.Cryptography.SHA256.Create()) {
                fingerprint = BitConverter.ToString(sha.ComputeHash(second))
                    .Replace("-", "").ToLowerInvariant();
            }
            Dictionary<string, object> record;
            try {
                record = new JavaScriptSerializer {
                    MaxJsonLength = 32768, RecursionLimit = 6
                }.DeserializeObject(Utf8.GetString(second)) as Dictionary<string, object>;
            } catch { return "malformed"; }
            if (record == null || record.Count != 8 ||
                !record.ContainsKey("schema") || !(record["schema"] is int) ||
                (int)record["schema"] != 1 ||
                !record.ContainsKey("version") || !(record["version"] is string) ||
                !Regex.IsMatch((string)record["version"],
                    @"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$") ||
                !record.ContainsKey("sha256") || !(record["sha256"] is string) ||
                !Regex.IsMatch((string)record["sha256"], "^[a-f0-9]{64}$") ||
                !record.ContainsKey("commit") || !(record["commit"] is string) ||
                !Regex.IsMatch((string)record["commit"], "^[a-f0-9]{40}$") ||
                !record.ContainsKey("bytes") ||
                !((record["bytes"] is int && (int)record["bytes"] > 0) ||
                  (record["bytes"] is long && (long)record["bytes"] > 0L)) ||
                !record.ContainsKey("files") || !(record["files"] is object[]) ||
                !record.ContainsKey("activation") ||
                !(record["activation"] is string) ||
                ((string)record["activation"] != "reload-required" &&
                 (string)record["activation"] != "operator-confirmed") ||
                !record.ContainsKey("createdUtc") ||
                !(record["createdUtc"] is string))
                return "malformed";
            DateTime created;
            if (!DateTime.TryParse((string)record["createdUtc"],
                CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out created))
                return "malformed";
            object[] files = (object[])record["files"];
            if (files.Length == 0 || files.Length > 512) return "malformed";
            HashSet<string> paths = new HashSet<string>(StringComparer.Ordinal);
            foreach (object item in files) {
                Dictionary<string, object> entry = item as Dictionary<string, object>;
                if (entry == null || entry.Count != 2 ||
                    !entry.ContainsKey("path") || !(entry["path"] is string) ||
                    !entry.ContainsKey("sha256") || !(entry["sha256"] is string) ||
                    !Regex.IsMatch((string)entry["sha256"], "^[a-f0-9]{64}$"))
                    return "malformed";
                string name = (string)entry["path"];
                if (name.Length == 0 || name.Length > 256 || name.StartsWith("/") ||
                    name.Contains("\\") || name.Contains("..") || name.Contains(":") ||
                    !paths.Add(name)) return "malformed";
            }
            version = (string)record["version"];
            return "legacy-installed";
        } catch { fingerprint = null; version = null; return "unknown"; }
    }

    // R2 native source: inspect the durable transaction generated by the
    // existing MANUAL Windows updater. This is not a P8 or MV3 Worker
    // transaction, never an independent Chrome activation or update lease.
    // The original actor and null MV3 IDs are mandatory, not inferred.
    static string ManualTransactionState(string path, out string transactionId,
        out string fingerprint, out string expectedReceipt, out string targetVersion) {
        transactionId = null;
        fingerprint = null;
        expectedReceipt = null;
        targetVersion = null;
        try {
            byte[] first = ReadBoundedJournal(path);
            byte[] second = ReadBoundedJournal(path);
            if (first.Length != second.Length) return "unknown";
            for (int i = 0; i < first.Length; i++)
                if (first[i] != second[i]) return "unknown";
            using (System.Security.Cryptography.SHA256 sha =
                System.Security.Cryptography.SHA256.Create()) {
                fingerprint = BitConverter.ToString(sha.ComputeHash(second))
                    .Replace("-", "").ToLowerInvariant();
            }
            Dictionary<string, object> data;
            try {
                data = new JavaScriptSerializer {
                    MaxJsonLength = 32768, RecursionLimit = 6
                }.DeserializeObject(Utf8.GetString(second)) as Dictionary<string, object>;
            } catch { return "unknown"; }
            string[] required = { "schema", "origin", "transactionId",
                "command", "phase", "workerGeneration", "admissionToken",
                "targetVersion", "previousReceiptSha256", "receiptSha256",
                "createdUtc", "completedUtc" };
            if (data == null || data.Count != required.Length) return "unknown";
            foreach (string key in required)
                if (!data.ContainsKey(key)) return "unknown";
            if (!(data["schema"] is int) || (int)data["schema"] != 1 ||
                !(data["origin"] is string) ||
                (string)data["origin"] != "manual-operator" ||
                !(data["transactionId"] is string) ||
                !Regex.IsMatch((string)data["transactionId"], "^[a-f0-9]{32}$") ||
                !(data["command"] is string) ||
                !Regex.IsMatch((string)data["command"], "^(install|update|oneclick|rollback|recover)$") ||
                !(data["phase"] is string) ||
                !Regex.IsMatch((string)data["phase"], "^(pending|files-installed|recovery-unbound)$") ||
                data["workerGeneration"] != null || data["admissionToken"] != null ||
                !(data["createdUtc"] is string)) return "unknown";
            DateTime created, completed;
            if (!DateTime.TryParse((string)data["createdUtc"], CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind, out created)) return "unknown";
            bool priorOk = data["previousReceiptSha256"] == null ||
                (data["previousReceiptSha256"] is string &&
                 Regex.IsMatch((string)data["previousReceiptSha256"], "^[a-f0-9]{64}$"));
            bool targetOk = data["targetVersion"] is string &&
                Regex.IsMatch((string)data["targetVersion"],
                    @"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$");
            string phase = (string)data["phase"];
            if (!priorOk) return "unknown";
            if (phase == "recovery-unbound") {
                if ((string)data["command"] != "recover" ||
                    data["targetVersion"] != null ||
                    data["previousReceiptSha256"] != null ||
                    data["receiptSha256"] != null || data["completedUtc"] != null)
                    return "unknown";
            } else if (phase == "pending") {
                if (!targetOk || (string)data["command"] == "recover" ||
                    data["receiptSha256"] != null || data["completedUtc"] != null)
                    return "unknown";
            } else {
                if (!targetOk || (string)data["command"] == "recover" ||
                    !(data["receiptSha256"] is string) ||
                    !Regex.IsMatch((string)data["receiptSha256"], "^[a-f0-9]{64}$") ||
                    !(data["completedUtc"] is string) ||
                    !DateTime.TryParse((string)data["completedUtc"],
                        CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind,
                        out completed) || completed < created)
                    return "unknown";
            }
            transactionId = (string)data["transactionId"];
            if (targetOk) targetVersion = (string)data["targetVersion"];
            if (phase == "files-installed") expectedReceipt = (string)data["receiptSha256"];
            return phase;
        } catch {
            transactionId = null;
            fingerprint = null;
            expectedReceipt = null;
            targetVersion = null;
            return "unknown";
        }
    }

    static Dictionary<string, object> InspectTransaction(string requestId) {
        string journal = "unknown", nativeLock = "unknown", receipt = "unknown",
            manual = "unknown";
        string stateRoot = null;
        try {
            string root = InspectRoot();
            if (root != null) {
                stateRoot = Path.Combine(root, "State");
                string journalPath = Path.Combine(stateRoot, "pending.json");
                string lockPath = Path.Combine(stateRoot, "updater.lock");
                string activePath = Path.Combine(stateRoot, "active.json");
                string manualPath = Path.Combine(stateRoot, "manual-transaction.json");
                // An artifact observed in either pass must never disappear
                // from the conservative combined result due to a race.
                string journalFirst = ProbeFile(journalPath);
                string lockFirst = ProbeFile(lockPath);
                string receiptFirst = ProbeFile(activePath);
                string manualFirst = ProbeFile(manualPath);
                string journalSecond = ProbeFile(journalPath);
                string lockSecond = ProbeFile(lockPath);
                string receiptSecond = ProbeFile(activePath);
                string manualSecond = ProbeFile(manualPath);
                journal = CombineProof(journalFirst, journalSecond);
                nativeLock = CombineProof(lockFirst, lockSecond);
                receipt = CombineProof(receiptFirst, receiptSecond);
                manual = CombineProof(manualFirst, manualSecond);
            }
        } catch { journal = "unknown"; nativeLock = "unknown"; receipt = "unknown"; manual = "unknown"; }
        string journalFingerprint = null;
        string journalFormat = journal == "present" && stateRoot != null
            ? LegacyJournalFormat(Path.Combine(stateRoot, "pending.json"),
                out journalFingerprint)
            : "unknown";
        string receiptFingerprint = null, receiptVersion = null;
        string receiptFormat = receipt == "present" && stateRoot != null
            ? LegacyInstalledReceipt(Path.Combine(stateRoot, "active.json"),
                out receiptFingerprint, out receiptVersion)
            : "unknown";
        string manualId = null, manualFingerprint = null, expectedReceipt = null,
            manualTargetVersion = null;
        string manualPhase = manual == "present" && stateRoot != null
            ? ManualTransactionState(Path.Combine(stateRoot, "manual-transaction.json"),
                out manualId, out manualFingerprint, out expectedReceipt,
                out manualTargetVersion)
            : manual == "absent" ? "absent" : "unknown";
        bool manualReceiptMatches = manualPhase == "files-installed" &&
            receiptFormat == "legacy-installed" &&
            String.Equals(expectedReceipt, receiptFingerprint, StringComparison.Ordinal) &&
            String.Equals(manualTargetVersion, receiptVersion, StringComparison.Ordinal);
        if (manualPhase == "files-installed")
            manualPhase = manualReceiptMatches ? "files-installed-unbound" : "mismatched-receipt";
        string transactionPhase = journal == "present"
            ? "pending-install-or-rollback"
            : nativeLock == "present" ? "lock-unverified" : "unknown";
        bool manualBlocks = manual == "present" &&
            manualPhase != "files-installed-unbound";
        string status = journal == "present" || nativeLock == "present" || manualBlocks
            ? "blocked" : "unverified";
        return new Dictionary<string, object> {
            { "protocol", ProtocolVersion }, { "requestId", requestId },
            { "ok", true }, { "operation", "inspect_transaction" },
            { "status", status }, { "journal", journal }, { "lock", nativeLock },
            { "transactionPhase", transactionPhase },
            { "journalFormat", journalFormat },
            { "journalFingerprint", journalFingerprint },
            { "receipt", receipt },
            { "receiptFormat", receiptFormat },
            { "receiptFingerprint", receiptFingerprint },
            { "receiptVersion", receiptVersion },
            { "manualPresence", manual },
            { "manualTransaction", manualPhase },
            { "manualTransactionId", manualId },
            { "manualTransactionFingerprint", manualFingerprint },
            { "manualTransactionOrigin", manualId == null ? null : "manual-operator" },
            { "manualReceiptMatches", manualReceiptMatches },
            { "identityBound", false },
            { "nativeOutcomeVerified", false }, { "rollbackVerified", false },
            { "eligibleForLease", false }
        };
    }

    static Dictionary<string, object> Check(string requestId) {
        string updater = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, UpdaterFilename);
        if (!File.Exists(updater)) return Error(requestId, "UPDATER_NOT_INSTALLED");
        string powershell = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),
                                         @"WindowsPowerShell\v1.0\powershell.exe");
        if (!File.Exists(powershell)) return Error(requestId, "POWERSHELL_UNAVAILABLE");
        ProcessStartInfo psi = new ProcessStartInfo {
            FileName = powershell,
            Arguments = "-NoProfile -NonInteractive -File \"" + updater + "\" -Command check",
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        try {
            using (Process p = new Process { StartInfo = psi }) {
                if (!p.Start()) return Error(requestId, "CHECK_START_FAILED");
                if (!p.WaitForExit(45000)) {
                    try { p.Kill(); } catch { }
                    return Error(requestId, "CHECK_TIMEOUT");
                }
                if (p.ExitCode != 0) return Error(requestId, "CHECK_FAILED");
                string stdout = p.StandardOutput.ReadToEnd();
                MatchCollection found = CheckLine.Matches(stdout);
                if (found.Count != 1 || stdout.Length > 2048) return Error(requestId, "CHECK_RESPONSE_INVALID");
                Match match = found[0];
                return new Dictionary<string, object> {
                    { "protocol", ProtocolVersion }, { "requestId", requestId },
                    { "ok", true }, { "operation", "check" },
                    { "installed", match.Groups["installed"].Value },
                    { "approved", match.Groups["approved"].Value },
                    { "sha256", match.Groups["sha"].Value },
                    { "sourceCommit", match.Groups["commit"].Value }
                };
            }
        } catch { return Error(requestId, "CHECK_FAILED"); }
    }
}
