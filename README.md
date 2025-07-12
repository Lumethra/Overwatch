# Overwatch 🖥️

A system monitoring app I built because I wanted to see my CPU and GPU stats without opening Task Manager every 5 minutes.

Built with Tauri + Next.js + Rust because why not learn some new tech while making something useful.

## What it does

- Shows CPU usage and cores breakdown 
- Shows GPU info (basic stuff like name and memory)
- Updates every second so you can watch your PC struggle
- Dark mode because light mode is for psychopaths

## Screenshots

*TODO: add some screenshots when I'm not lazy*

## Running this thing

You'll need:
- Node.js 
- Rust
- Windows (sorry Mac/Linux users, maybe later)

```bash
git clone https://github.com/Lumethra/Overwatch.git
cd Overwatch/app
npm install
npm run tauri:dev
```

## Building

```bash
npm run tauri:build
```

The exe will be somewhere in `src-tauri/target/release/bundle/` - good luck finding it.

## Current status

✅ **Works:**
- CPU usage (real-time)
- CPU cores breakdown 
- CPU frequency and specs
- GPU name and memory
- Looks decent

❌ **Doesn't work yet:**
- GPU temperature (registry doesn't have this info)
- GPU usage (same problem)
- CPU temperature (sysinfo crate limitation)
- Probably lots of other stuff

## TODO (if I ever get around to it)

- [ ] Actual GPU monitoring with real APIs
- [ ] CPU temperature 
- [ ] RAM usage
- [ ] Maybe disk usage
- [ ] Motherboard data?
- [ ] Make it work on other OSes

## Tech stuff

- Frontend: Next.js 15 + React + TypeScript + Tailwind
- Backend: Rust + Tauri
- Data: Windows Registry + sysinfo crate
- Icons: Heroicons (they're free)

---