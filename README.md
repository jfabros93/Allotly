# Dynamic Calorie Counter

A mobile-first web app for weekly calorie budgeting and tracking. Your budget is set for the week, not the day. Log food and workouts, and today's target rebalances from whatever is left.

## Features

- **Weekly calorie budget** - Calculated using the Mifflin-St Jeor BMR formula
- **Dynamic daily targets** - Rebalances based on what's left in the week across remaining days
- **Daily logging** - Track food intake and exercise for each day (Mon-Sun)
- **Quick-add buttons** - Common items like Vietnamese coffee (250 cal), meals (600), snacks (200), walks (150), gym (250)
- **Miles-run calculator** - Automatically calculates calories burned based on your weight (0.72 × weight per mile)
- **Plan a big day** - Create scenarios for special events (birthdays, parties) with automatic rebalancing
- **Weigh-ins tracking** - Log your weight over time with trend visualization
- **Week at a glance** - Color-coded view showing how each day compares to target (red = over, green = on target, blue = under)
- **Persistent storage** - All data saved to localStorage

## How to Run Locally

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

The app will be available at the URL shown in the terminal (typically `http://localhost:5173`).

## Default Settings

- **Weight**: 190 lbs
- **Height**: 5 ft 9 in
- **Age**: 33
- **Weekly goal**: Lose 2 lbs/week
- **Activity level**: 1.375 (Desk job plus kids)
- **Daily calorie floor**: 1,400 calories (minimum safe intake)

## Seed Data

The app comes pre-loaded with example data for the week of November 9, 2026:
- **Monday**: 2,630 food / 0 burn
- **Tuesday**: 870 food / 137 burn
- **Wednesday**: 1,200 food / 0 burn
- **Thursday**: 300 food / 0 burn

And includes a committed plan for Saturday (Knott's Berry Farm birthday) with Thursday, Friday, and Sunday held at 1,400 calories each.

## Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist` directory.
