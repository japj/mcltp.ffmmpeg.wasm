// Runtime capability checks
const checks = {
    webWorkers: 'Worker' in window,
    crossOriginIsolated: window.crossOriginIsolated === true,
    simd: WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,9,1,7,0,65,0,253,15,26,11])),
    sharedMemory: (() => {
        try {
            new SharedArrayBuffer(1);
            return true;
        } catch (e) {
            return false;
        }
    })()
};

document.addEventListener('DOMContentLoaded', async function() { 
    // if not yet cross-origin isolated, do not proceed, but wait for reload of page by coi-serviceworker
    if (window.crossOriginIsolated !== true) return;
    // remove hidden style from the body
    document.body.style.visibility = 'visible';
 
    if (!Object.values(checks).every(v => v)) {
        const missing = Object.entries(checks)
            .filter(([_, v]) => !v)
            .map(([k]) => k)
            .join(', ');
        
        const message = `Missing required features: ${missing}\n\nThis application requires:\n- Web Workers\n- Cross-Origin Isolation\n- Fixed-Width SIMD support\n- Shared Memory support`;
        alert(message);
        throw new Error(message);
    }

    // Initialize FFmpeg
    let ffmpeg;

    async function initFFmpeg(loadingText) {
        ffmpeg = await createFFmpeg({
            logger: message => {
                //console.log('FFmpeg:', message);
                appendToLog(message);
            },
            progress: p => {
                console.log('FFmpeg progress:', p);
                loadingText.textContent = `Processing: ${(p.ratio * 100).toFixed(0)}%`;
                appendToLog(`Progress: ${(p.ratio * 100).toFixed(0)}%`);
            },
            printErr: message => {
                //console.error('FFmpeg error:', message);
                appendToLog(message);
                parseFFmpegProgressOutput(message);
                // if (loadingOverlay.style.display === 'flex') {
                //     loadingText.textContent = 'FFmpeg error: ' + message;
                // }
            }
        });
        return ffmpeg;
    }

    function appendToLog(message, isError = false) {
        const logContainer = document.getElementById('logContainer');
        const entry = document.createElement('div');
        entry.className = 'log-entry' + (isError ? ' log-error' : '');
        entry.textContent = message;
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    let totalDurationInSeconds = 0; // Set this to the total duration of your input file if known

    function extractTimeInSeconds(timeMatch) {
        // Example line: "frame=   54 fps=0.0 q=-0.0 size=     256kB time=00:00:02.16 bitrate= 968.9kbits/s speed=4.32x"
        
        if (timeMatch) {
            const timeStr = timeMatch[1];
            // Convert time string to seconds
            const timeParts = timeStr.split(/[:,\.]/);
            return parseInt(timeParts[0]) * 3600 + 
                   parseInt(timeParts[1]) * 60 + 
                   parseInt(timeParts[2]) + 
                   parseFloat("0." + timeParts[3]);
        }
        return null;
    }

    function updateProgressCircle(progress) {
        const circle = document.querySelector('.progress-circle-path');
        const percentage = document.querySelector('.progress-percentage');
        if (circle && percentage) {
            const circumference = 282.74; // 2 * π * 45
            const offset = circumference - (progress * circumference);
            circle.style.strokeDashoffset = offset;
            percentage.textContent = Math.round(progress * 100) + '%';
        }
    }

    function parseFFmpegProgressOutput(line) {
        // Parse for progress information - FFmpeg typically outputs lines like:
        // frame=   54 fps=0.0 q=-0.0 size=     256kB time=00:00:02.16 bitrate= 968.9kbits/s speed=4.32x
        if (line.includes("time=") && line.includes("speed=")) {
            const timeMatch = line.match(/time=(\d+:\d+:\d+\.\d+)/);
            const timeInSeconds = extractTimeInSeconds(timeMatch);
            
            // If you know the total duration, you can calculate progress percentage
            const progressRatio = timeInSeconds / totalDurationInSeconds;
            console.log("progress",progressRatio);
            if (totalDurationInSeconds > 0 && timeInSeconds) {
                const progressRatio = Math.min(timeInSeconds / totalDurationInSeconds, 1);
                updateProgressCircle(progressRatio);
            }
        }
        if (line.includes("Duration:")) {
            // Parse for full duration information
            //   Duration: 00:03:45.28, start: 0.000000, bitrate: 768 kb/s
            const durationMatch = line.match(/Duration: (\d+:\d+:\d+\.\d+)/);
            // keep the maximum detected duration
            if (durationMatch) {
                const durationInSeconds = extractTimeInSeconds(durationMatch);
                if (durationInSeconds > totalDurationInSeconds) {
                    totalDurationInSeconds = durationInSeconds;
                    console.log("Total Duration in seconds: " + totalDurationInSeconds);
                }
            }
        }
    }

    const loadingOverlay = document.getElementById('loadingOverlay');
    const initOverlay = document.getElementById('initOverlay');
    const loadingText = document.getElementById('loadingText');
    //initOverlay.style.display = 'flex';

    try {
        await initFFmpeg(loadingText);
        //initOverlay.style.display = 'none';
    } catch (error) {
        initOverlay.style.display = 'flex';
        console.error('FFmpeg initialization error:', error);
        initOverlay.innerHTML = '<div>Failed to initialize FFmpeg: ' + error.message + '</div>';
        return;
    }

    // Add global error handler for worker
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        loadingText.textContent = 'Error: ' + event.reason;
        loadingOverlay.style.display = 'none';
    });

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const voicePartsList = document.getElementById('voicePartsList');
    const convertButton = document.getElementById('convertButton');
    const output = document.getElementById('output');
    const songTitleInput = document.getElementById('songTitle');
    const bitratePerPartInput = document.getElementById('bitratePerPart');
    
    // Voice parts storage
    let voiceParts = [];
    
    // Handle file selection
    function handleFiles(files) {
        for (const file of files) {
            if (file.type.startsWith('audio/')) {
                const fileName = file.name;
                const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
                
                voiceParts.push({
                    file: file,
                    name: nameWithoutExtension,
                    originalName: fileName
                });
            }
        }
        updateVoicePartsList();
    }
    
    // Update the list of voice parts in the UI
    function updateVoicePartsList() {
        voicePartsList.innerHTML = '';
        
        voiceParts.forEach((part, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'voice-part';
            listItem.dataset.index = index;
            listItem.draggable = true;
            
            const handle = document.createElement('div');
            handle.className = 'handle';
            handle.innerHTML = '&#8942; &#8942;';
            
            const nameInput = document.createElement('div');
            nameInput.className = 'part-name';
            nameInput.textContent = part.name;
            nameInput.contentEditable = true;
            nameInput.addEventListener('blur', function() {
                voiceParts[index].name = this.textContent.trim();
            });
            
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            fileInfo.textContent = `(${formatFileSize(part.file.size)})`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.title = 'Remove this voice part';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                voiceParts.splice(index, 1);
                updateVoicePartsList();
            };
            
            listItem.appendChild(handle);
            listItem.appendChild(nameInput);
            listItem.appendChild(fileInfo);
            listItem.appendChild(deleteBtn);
            voicePartsList.appendChild(listItem);
            
            // Set up drag events
            listItem.addEventListener('dragstart', handleDragStart);
            listItem.addEventListener('dragover', handleDragOver);
            listItem.addEventListener('dragenter', handleDragEnter);
            listItem.addEventListener('dragleave', handleDragLeave);
            listItem.addEventListener('drop', handleDrop);
            listItem.addEventListener('dragend', handleDragEnd);
        });
    }
    
    // Drag and drop for list reordering
    let dragSourceIndex = null;
    
    function handleDragStart(e) {
        this.classList.add('dragging');
        dragSourceIndex = parseInt(this.dataset.index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragSourceIndex);
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }
    
    function handleDragEnter(e) {
        this.classList.add('drag-over');
    }
    
    function handleDragLeave(e) {
        this.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        e.stopPropagation();
        e.preventDefault();
        
        this.classList.remove('drag-over');
        
        const targetIndex = parseInt(this.dataset.index);
        if (dragSourceIndex !== null && dragSourceIndex !== targetIndex) {
            const itemToMove = voiceParts[dragSourceIndex];
            voiceParts.splice(dragSourceIndex, 1);
            voiceParts.splice(targetIndex, 0, itemToMove);
            updateVoicePartsList();
        }
        
        return false;
    }
    
    function handleDragEnd(e) {
        document.querySelectorAll('.voice-part').forEach(item => {
            item.classList.remove('dragging');
            item.classList.remove('drag-over');
        });
    }
    
    // File drop zone event handlers
    dropZone.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
        this.value = ''; // Reset to allow selecting the same files again
    });
    
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('active');
    });
    
    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('active');
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('active');
        
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
    
    // Generate FFmpeg command and process files
    convertButton.addEventListener('click', async function() {
        if (voiceParts.length === 0) {
            alert('Please add voice parts first.');
            return;
        }

        loadingOverlay.style.display = 'flex';
        loadingText.textContent = 'Processing audio files...';
        updateProgressCircle(0); // Reset progress

        try {
            ffmpeg = await initFFmpeg(loadingText);
            
            // Write input files to FFmpeg virtual filesystem
            for (let i = 0; i < voiceParts.length; i++) {
                const part = voiceParts[i];
                const data = await part.file.arrayBuffer();
                console.log(`Writing file: input${i}.wav (${part.file.size} bytes)`);
                ffmpeg.FS.writeFile(`input${i}.wav`, new Uint8Array(data));
            }

            // Build command array
            const args = [
                //'-y'       // Overwrite output if exists
                '-stats',
                '-v','verbose',
            ];
            
            // Add input files
            voiceParts.forEach((_, i) => {
                args.push('-i', `input${i}.wav`);
            });

            // Add filter_complex for merging
            const filterComplex = voiceParts.map((_, i) => `[${i}:a]`).join('') + 
                               `amerge=inputs=${voiceParts.length}[aout]`;
            args.push('-filter_complex', filterComplex);
            args.push('-map', '[aout]');
            args.push('-c:a', 'libopus');
            
            // Calculate bitrate based on number of parts and user input
            const bitratePerPart = Math.max(16, Math.min(512, parseInt(bitratePerPartInput.value) || 48));
            const totalBitrate = voiceParts.length * bitratePerPart;
            args.push('-b:a', `${totalBitrate}k`);
            
            args.push('-mapping_family', '255');
            
            const songTitle = songTitleInput.value.trim() || "Choir Recording";
            args.push('-metadata', `title=${songTitle}`);
            
            // Add channel metadata (old style)
            const channelOrder = voiceParts.map(part => part.name).join(', ');
            args.push('-metadata', `comment=Channel order: ${channelOrder}`);
           
            // TODO: this is the new metadata format
            // voiceParts.forEach((part, i) => {
            //     args.push('-metadata', `CHANNEL_${i+1}=${part.name}`);
            // });

            args.push('output.opus');

            console.log('Running FFmpeg command:', args.join(' '));

            ffmpeg.onExit = result => {

                if (result !== 0) {
                    throw new Error(`FFmpeg command failed with code ${result}`);
                }
                console.log('FFmpeg processing completed successfully.');

                console.log('Reading output file...');
                // Read the output file
                const data = ffmpeg.FS.readFile('output.opus');
                
                // Create download link
                const blob = new Blob([data.buffer], { type: 'audio/opus' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${songTitle}.opus`;
                a.click();
                URL.revokeObjectURL(url);

                // Cleanup files
                // voiceParts.forEach((_, i) => {
                //     ffmpeg.FS.unlink(`input${i}.wav`);
                // });
                // ffmpeg.FS.unlink('output.opus');
                
                loadingOverlay.style.display = 'none';
            };

            ffmpeg.callMain(args);
            
            // ffmpeg calls onExit when
            
        } catch (error) {
            console.error('FFmpeg processing error:', error);
            loadingText.textContent = 'Error processing files: ' + error.message;
            loadingOverlay.style.display = 'none';
        }
    });
    
    // Helper function to format file size
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }

    // console.log = function(message) {
    //     appendToLog(message);
    //     window.console.info.apply(console, arguments);
    // };
    // console.error = function(message) {
    //     appendToLog(message, true);
    //     window.console.error.apply(console, arguments);
    // };
});