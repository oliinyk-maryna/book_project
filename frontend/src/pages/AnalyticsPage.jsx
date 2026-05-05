// ActivityHeatmap та WeekChart залишаємо як допоміжні, але з оновленими стилями
export default function AnalyticsPage({ isLoggedIn }) {
  const { stats, calendar, isLoading, goalProps, saveGoal } = useAnalyticsData(isLoggedIn);
  const year = new Date().getFullYear();

  if (!isLoggedIn) return <EmptyAnalyticsState />;
  if (isLoading) return <AnalyticsSkeleton />;

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 pb-32 animate-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-serif font-bold text-stone-900 tracking-tight">Ваша історія</h1>
          <p className="text-stone-500 mt-2 font-medium">Статистика читання за {year} рік</p>
        </div>
        <button
          onClick={() => goalProps.setShowForm(!goalProps.showForm)}
          className="group flex items-center gap-2 text-sm font-bold bg-stone-900 text-white px-6 py-3 rounded-2xl hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
        >
          <Target className="w-4 h-4 transition-transform group-hover:scale-110" />
          {goalProps.showForm ? 'Закрити налаштування' : 'Встановити ціль'}
        </button>
      </header>

      {/* Основні метрики */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard icon={BookOpen} bg="bg-emerald-50" label="Прочитано" value={stats.booksRead} sub="видань всього" />
        <StatCard icon={Flame} bg="bg-orange-50" label="Прогрес року" value={stats.booksYear} sub={`${stats.gBooks} за планом`} />
        <StatCard icon={Clock} dark label="Час у книгах" value={stats.hours} sub="годин занурення" />
        <StatCard icon={Zap} bg="bg-amber-50" label="Ударний темп" value={`${stats.streak} дн.`} sub="без перерв" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Картка цілі та швидкості */}
        <div className="lg:col-span-2 space-y-6">
          <GoalSection {...goalProps} stats={stats} year={year} onSave={saveGoal} />
          
          <section className="bg-white rounded-[2rem] border border-stone-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-stone-900 flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600" /> Тижнева активність
              </h3>
            </div>
            <WeekChart days={calendar} />
          </section>
        </div>

        <div className="space-y-6">
          <SpeedCard speed={stats.speed} genre={stats.genre} />
          <section className="bg-white rounded-[2rem] border border-stone-200 p-8 shadow-sm">
             <h3 className="font-bold text-stone-900 flex items-center gap-2 mb-6">
               <Calendar className="w-5 h-5 text-stone-400" /> Теплова карта
             </h3>
             <ActivityHeatmap days={calendar} />
          </section>
        </div>
      </div>
    </main>
  );
}