import { normalizarTexto, processarHorario, processarData } from '../src/utils/utils.js';

describe('Utilitários do Bot', () => {

    describe('normalizarTexto', () => {
        test('deve remover acentos e converter para minúsculo', () => {
            expect(normalizarTexto('Atenção')).toBe('atencao');
            expect(normalizarTexto('Olá Mundo')).toBe('ola mundo');
            expect(normalizarTexto('É de manhã')).toBe('e de manha');
        });

        test('deve remover espaços extras', () => {
            expect(normalizarTexto('  teste  ')).toBe('teste');
        });
    });

    describe('processarHorario', () => {
        test('deve aceitar formato 15h30', () => {
            expect(processarHorario('15h30')).toBe('15:30');
        });

        test('deve aceitar formato 15:30', () => {
            expect(processarHorario('15:30')).toBe('15:30');
        });

        test('deve aceitar formato 1530', () => {
            expect(processarHorario('1530')).toBe('15:30');
        });

        test('deve aceitar formato 15h', () => {
            expect(processarHorario('15h')).toBe('15:00');
        });

        test('deve aceitar apenas a hora', () => {
            expect(processarHorario('15')).toBe('15:00');
        });

        test('deve retornar null para horários inválidos', () => {
            expect(processarHorario('25:00')).toBe(null);
            expect(processarHorario('abc')).toBe(null);
        });
    });

    describe('processarData', () => {
        test('deve aceitar formato DD/MM', () => {
            expect(processarData('25/12')).toBe('2025-12-25');
        });

        test('deve aceitar formato DD-MM', () => {
            expect(processarData('25-12')).toBe('2025-12-25');
        });

        test('deve aceitar formato DD/MM/YYYY', () => {
            expect(processarData('25/12/2026')).toBe('2026-12-25');
        });

        test('deve retornar null para datas inválidas', () => {
            expect(processarData('32/01')).toBe(null);
            expect(processarData('29/02/2025')).toBe(null); // 2025 não é bissexto
            expect(processarData('agendar')).toBe(null);
        });
    });

});
