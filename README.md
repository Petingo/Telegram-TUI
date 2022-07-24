# TeTg
A telegram client on your terminal!
![](./imgs/example.gif)

## Usage
- `s`: Send message to corresponding chat
- `r`: Reply a message
- `c`: Open UI of chats, then `enter` to send message to chat

## TODO List:
### Feature
- [ ] Cache data in local db
- [ ] Reply to message should be shown in UI
- [ ] Optimize Hint

### Refactor
- [ ] In `tui.js`, `sendMsgByRefMsgId`'s first param should be changed

### Bug
- [ ] Bug with emoji, this may have to be fixed in blessed

## About
This app is mainly powered by [airgram](https://github.com/airgram/airgram) and [blessed](https://github.com/chjj/blessed)

## Reference
- TDLib API Doc: https://core.telegram.org/tdlib/docs/td__api_8h.html