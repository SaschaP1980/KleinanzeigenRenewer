// KAR-64 Wave 01: read-only Chrome Native Messaging host (.NET Framework / Windows).
// Installed per-user by Install-KleinanzeigenRenewer-NativeHost.ps1.
// One request per process (Chrome runtime.sendNativeMessage); no mutating operations.
using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Diagnostics;
using System.Collections.Generic;
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

    static int Main(string[] args) {
        // Chrome may append --parent-window=..., but never accept custom arguments.
        if (args.Length > 1 || (args.Length == 1 && !args[0].StartsWith("--parent-window=", StringComparison.Ordinal))) return 2;
        try {
            using (Stream input = Console.OpenStandardInput()) {
                byte[] header = ReadExactly(input, 4);
                if (header == null) return 0;
                uint length = (uint)(header[0] | (header[1] << 8) | (header[2] << 16) | (header[3] << 24));
                if (length == 0 || length > MaximumFrame) { var error = Error(null, "FRAME_REJECTED"); error["receivedHeader"] = BitConverter.ToString(header); Write(error); return 1; }
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
                        { "capabilities", new string[] { "health", "check" } }
                    });
                    return 0;
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
