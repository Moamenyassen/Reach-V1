
import { supabase } from './services/supabase';

async function testStorage() {
    console.log("Testing storage upload...");
    const dummyBlob = new Blob(['test'], { type: 'text/plain' });
    const file = new File([dummyBlob], 'test.txt', { type: 'text/plain' });

    const { data, error } = await supabase.storage
        .from('company-logos')
        .upload('test.txt', file);

    if (error) {
        console.error("Storage Error:", error);
    } else {
        console.log("Storage Success:", data);
    }
}

testStorage();
