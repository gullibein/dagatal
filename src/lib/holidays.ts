import { 
  addDays, 
  nextThursday, 
  nextMonday,
  isSameDay,
  nextSunday
} from 'date-fns';
import { Holiday } from '../types';

function getEaster(year: number): Date {
  const f = Math.floor,
    G = year % 19,
    C = f(year / 100),
    H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
    I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
    J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
    L = I - J,
    month = 3 + f((L + 40) / 44),
    day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
}

export function getIcelandicHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [];
  const easter = getEaster(year);

  // Fixed holidays
  holidays.push({ date: new Date(year, 0, 1), name: 'Nýársdagur', isPublic: true });
  holidays.push({ date: new Date(year, 4, 1), name: 'Verkalýðsdagurinn', isPublic: true });
  holidays.push({ date: new Date(year, 5, 17), name: 'Þjóðhátíðardagurinn', isPublic: true });
  holidays.push({ date: new Date(year, 10, 16), name: 'Dagur íslenskrar tungu', isPublic: false });
  holidays.push({ date: new Date(year, 11, 1), name: 'Fullveldisdagurinn', isPublic: false });
  holidays.push({ date: new Date(year, 11, 24), name: 'Aðfangadagur', isPublic: true });
  holidays.push({ date: new Date(year, 11, 25), name: 'Jóladagur', isPublic: true });
  holidays.push({ date: new Date(year, 11, 26), name: 'Annar í jólum', isPublic: true });
  holidays.push({ date: new Date(year, 11, 31), name: 'Gamlársdagur', isPublic: true });

  // Easter related
  holidays.push({ date: addDays(easter, -48), name: 'Bolludagur', isPublic: false });
  holidays.push({ date: addDays(easter, -47), name: 'Sprengidagur', isPublic: false });
  holidays.push({ date: addDays(easter, -46), name: 'Öskudagur', isPublic: false });
  holidays.push({ date: addDays(easter, -3), name: 'Skírdagur', isPublic: true });
  holidays.push({ date: addDays(easter, -2), name: 'Föstudagurinn langi', isPublic: true });
  holidays.push({ date: easter, name: 'Páskadagur', isPublic: true });
  holidays.push({ date: addDays(easter, 1), name: 'Annar í páskum', isPublic: true });
  holidays.push({ date: addDays(easter, 39), name: 'Uppstigningardagur', isPublic: true });
  holidays.push({ date: addDays(easter, 49), name: 'Hvítasunnudagur', isPublic: true });
  holidays.push({ date: addDays(easter, 50), name: 'Annar í hvítasunnu', isPublic: true });

  // Sumardagurinn fyrsti: First Thursday after April 18
  const april18 = new Date(year, 3, 18);
  holidays.push({ date: nextThursday(april18), name: 'Sumardagurinn fyrsti', isPublic: true });

  // Sjómannadagurinn: First Sunday in June, or second if Whit Sunday is on the first Sunday
  const june1 = new Date(year, 5, 1);
  let sjomanna = june1.getDay() === 0 ? june1 : nextSunday(june1);
  if (isSameDay(sjomanna, addDays(easter, 49))) {
    sjomanna = addDays(sjomanna, 7);
  }
  holidays.push({ date: sjomanna, name: 'Sjómannadagurinn', isPublic: false });

  // Verslunarmannahelgi: First Monday in August
  const aug1 = new Date(year, 7, 1);
  const bankHoliday = aug1.getDay() === 1 ? aug1 : nextMonday(aug1);
  holidays.push({ date: bankHoliday, name: 'Frídagur verslunarmanna', isPublic: true });

  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function isHoliday(date: Date, holidayList: Holiday[]): Holiday | undefined {
  return holidayList.find(h => isSameDay(h.date, date));
}
