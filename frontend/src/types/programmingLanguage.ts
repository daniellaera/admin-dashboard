import { OptionBase } from "chakra-react-select";

export interface ProgrammingLanguage extends OptionBase {
    label: string;
    value: string;
}

export const programmingLanguages: ProgrammingLanguage[] = [
    { value: 'python', label: 'Python' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'java', label: 'Java' },
    { value: 'php', label: 'PHP' },
    { value: 'golang', label: 'GoLang' },
    { value: 'c++', label: 'C++' },
    { value: 'c#', label: 'C#' },
    { value: 'clojure', label: 'Clojure' },
    { value: 'scala', label: 'Scala' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'solidity', label: 'Solidity' },
    { value: 'rust', label: 'Rust' },
    { value: '.net', label: '.NET' }
];