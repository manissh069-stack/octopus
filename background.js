async function run(tab) {
  if (!tab || !tab.id) return;
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
}
chrome.commands.onCommand.addListener((cmd, tab) => { if (cmd === "scan") run(tab); });
chrome.action.onClicked.addListener(run);
chrome.runtime.onMessage.addListener((msg, sender, send) => {
  if (msg.type === "capture") {
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" })
      .then((dataUrl) => send({ dataUrl }))
      .catch((e) => send({ error: String(e) }));
    return true;
  }
});