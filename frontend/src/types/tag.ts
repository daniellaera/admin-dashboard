import { OptionBase } from "chakra-react-select";

export interface Tag extends OptionBase {
    label: string;
    value: string;
}

export const tags: Tag[] = [
    { value: 'engineering', label: 'Engineering' },
    { value: 'computerscience', label: 'Computer Science' },
    { value: 'product', label: 'Product' },
    { value: 'productivity', label: 'Productivity' },
    { value: 'algorithms', label: 'Algorithms' },
    { value: 'joblife', label: 'Job Life' },
    { value: 'tech', label: 'Tech' },
    { value: 'security', label: 'Security' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'it', label: 'IT' },
    { value: 'hardware', label: 'Hardware' },
    { value: 'programming', label: 'Programming' },
    { value: 'devops', label: 'DevOps' },
    { value: 'cybersecurity', label: 'Cybersecurity' },
];