import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const celeste = {
  50: '#f0fbff',
  100: '#e6f8fc',
  200: '#baeaf6',
  300: '#69c9e3',
  400: '#00aad6',
  500: '#008eb5',
  600: '#007b9e',
  700: '#006780',
  800: '#15546a',
  900: '#16465a',
  950: '#082f40',
};

export const appTheme = definePreset(Aura, {
  primitive: { green: celeste, emerald: celeste },
  semantic: { primary: celeste },
  components: {
    button: {
      root: {
        borderRadius: '0.75rem',
        primary: {
          background: '#000',
          borderColor: '#000',
          color: '#fff',
          hoverBackground: '#222',
          hoverBorderColor: '#222',
          hoverColor: '#fff',
          activeBackground: '#000',
          activeBorderColor: '#000',
          activeColor: '#fff',
          focusRing: { color: '#64748b', shadow: 'none' },
        },
      },
      outlined: {
        primary: {
          color: '#475569',
          borderColor: '#cbd5e1',
          hoverBackground: '#f1f5f9',
          activeBackground: '#e2e8f0',
        },
      },
      text: { primary: { color: '#000', hoverBackground: '#f1f5f9', activeBackground: '#e2e8f0' } },
    },
    dialog: {
      root: { borderColor: 'transparent', borderRadius: '1rem' },
      title: { fontSize: '1.875rem', fontWeight: '750' },
    },
    toolbar: { root: { borderRadius: '0.75rem', background: '#fff', borderColor: '#e2e8f0' } },
    inputtext: { root: { borderRadius: '0.75rem', borderColor: '#cbd5e1' } },
    textarea: { root: { borderRadius: '0.75rem', borderColor: '#cbd5e1' } },
    select: { root: { borderRadius: '0.75rem', borderColor: '#cbd5e1' } },
  },
});
